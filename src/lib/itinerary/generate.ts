import type {
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  PlannerInput,
  WeatherSummary,
} from "@/lib/types";
import { tripDates } from "@/lib/types";
import type { OpeningPeriod } from "@/lib/google/places";
import { getForecastRange } from "@/lib/weather";
import { findPlace, photoProxyUrl } from "@/lib/google/places";
import { travelMinutes, travelMatrix } from "@/lib/google/routes";
import { bestOrder } from "@/lib/itinerary/optimize";
import { isOpenAt, dayHoursText, hhmmToMinutes } from "@/lib/itinerary/hours";
import { planItinerary, type PlannedItinerary } from "@/lib/ai/planner";
import type { CallRecorder } from "@/lib/usage/types";

// How far a stop may drift from its planner-intended arrival time during
// route optimization, in minutes. Keeps the day's arc (morning coffee,
// evening music) intact instead of chasing pure travel savings.
const TIME_SLOT_TOLERANCE_MIN = 150;

const DAY_END_MIN = 23 * 60 + 59;

function diffHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, Math.round((mins / 60) * 10) / 10);
}

/** Add minutes to an "HH:mm" clock string, clamped to the same day. */
function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + Math.max(0, Math.round(mins));
  total = Math.min(total, DAY_END_MIN);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/**
 * Reorder stops into the optimal travel sequence, then re-flow arrival times
 * from the first stop's start so the schedule stays consistent with the new
 * order. Returns the reordered stops and the total travel time.
 */
function applyOptimizedOrder(
  stops: ItineraryStop[],
  order: number[],
  matrix: number[][]
): { stops: ItineraryStop[]; totalTravel: number } {
  const reordered = order.map((idx) => stops[idx]);
  let totalTravel = 0;
  let clock = reordered[0]?.arriveTime || "";

  reordered.forEach((stop, k) => {
    stop.order = k + 1;
    if (k === 0) {
      clock = stop.arriveTime; // keep the day's start anchor
    } else {
      const legMin = matrix[order[k - 1]][order[k]];
      const travel = Number.isFinite(legMin) ? legMin : 0;
      clock = addMinutes(clock, reordered[k - 1].durationMin + travel);
      stop.arriveTime = clock;
    }
    const nextLeg = k < reordered.length - 1 ? matrix[order[k]][order[k + 1]] : 0;
    stop.travelToNextMin = Number.isFinite(nextLeg) ? nextLeg : null;
    if (k < reordered.length - 1 && Number.isFinite(nextLeg)) totalTravel += nextLeg;
  });

  return { stops: reordered, totalTravel };
}

/**
 * Route-optimize and hours-validate a single day.
 *
 * Optimization is scoped to one day on purpose: reordering across days would
 * shuffle stops between dates, which breaks both the day themes the model
 * chose and any venue whose opening hours differ by weekday.
 */
async function buildDay(
  args: {
    dayIndex: number;
    date: string;
    theme: string;
    stops: ItineraryStop[];
    periods: (OpeningPeriod[] | null)[];
    weather: WeatherSummary;
  },
  input: PlannerInput,
  rec?: CallRecorder
): Promise<ItineraryDay> {
  const { dayIndex, date, theme, stops: enriched, periods, weather } = args;

  // Weekday of this specific day (0=Sunday … 6=Saturday), for hours lookups.
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();

  const periodsByStop = new Map<ItineraryStop, OpeningPeriod[] | null>();
  enriched.forEach((s, i) => periodsByStop.set(s, periods[i]));

  let stops = enriched;
  let optimized = false;
  let dayTravelMin: number | undefined;

  const coords = enriched.map((s) =>
    s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null
  );
  const allHaveCoords = coords.every((c) => c !== null);

  if (allHaveCoords && enriched.length >= 3) {
    const matrix = await travelMatrix(
      coords as { lat: number; lng: number }[],
      input.transport,
      rec
    );
    if (matrix) {
      const aiArrival = enriched.map((s) => hhmmToMinutes(s.arriveTime));

      // Arrival time (minutes past midnight) of each stop for a given order,
      // re-flowed from the pinned start using durations + real travel.
      const scheduleFor = (order: number[]): number[] => {
        const arr: number[] = [];
        let clock = aiArrival[order[0]];
        for (let k = 0; k < order.length; k++) {
          if (k > 0) {
            const leg = matrix[order[k - 1]][order[k]];
            clock +=
              enriched[order[k - 1]].durationMin +
              (Number.isFinite(leg) ? leg : 0);
          }
          arr[k] = Math.min(clock, DAY_END_MIN);
        }
        return arr;
      };

      const isValid = (order: number[]): boolean => {
        const arr = scheduleFor(order);
        for (let k = 0; k < order.length; k++) {
          const idx = order[k];
          // Stay in the planner's intended part of the day.
          if (Math.abs(arr[k] - aiArrival[idx]) > TIME_SLOT_TOLERANCE_MIN) {
            return false;
          }
          // Never schedule a stop while the venue is closed.
          if (isOpenAt(periods[idx], weekday, arr[k]) === false) {
            return false;
          }
        }
        return true;
      };

      const { order, valid } = bestOrder(matrix, isValid);
      if (valid) {
        const result = applyOptimizedOrder(enriched, order, matrix);
        stops = result.stops;
        dayTravelMin = result.totalTravel;
        optimized = true;
      } else {
        // No reorder respects both timing and hours — keep the planner's
        // order (and its times), just refresh consecutive travel from the matrix.
        for (let i = 0; i < enriched.length - 1; i++) {
          const leg = matrix[i][i + 1];
          if (Number.isFinite(leg)) enriched[i].travelToNextMin = leg;
        }
        enriched[enriched.length - 1].travelToNextMin = 0;
        dayTravelMin = enriched.reduce(
          (sum, s) => sum + (s.travelToNextMin ?? 0),
          0
        );
      }
    }
  }

  // Fallback (transit, missing coords, or matrix unavailable): keep the AI's
  // order and fill consecutive travel times with per-leg Routes calls.
  if (!optimized && dayTravelMin === undefined) {
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
        const mins = await travelMinutes(
          { lat: a.lat, lng: a.lng },
          { lat: b.lat, lng: b.lng },
          input.transport,
          rec
        );
        if (mins != null) a.travelToNextMin = mins;
      }
    }
    if (stops.length) stops[stops.length - 1].travelToNextMin = 0;
    dayTravelMin = stops.reduce((sum, s) => sum + (s.travelToNextMin ?? 0), 0);
  }

  // Validate final arrival times against real opening hours and flag closures.
  for (const stop of stops) {
    stop.openAtArrival = isOpenAt(
      periodsByStop.get(stop) ?? null,
      weekday,
      hhmmToMinutes(stop.arriveTime)
    );
  }

  const costLow = stops.reduce((sum, s) => sum + (s.costLow ?? 0), 0);
  const costHigh = stops.reduce((sum, s) => sum + (s.costHigh ?? 0), 0);

  return {
    dayIndex,
    date,
    theme,
    stops,
    estCostLow: costLow || null,
    estCostHigh: costHigh || null,
    weather,
    optimized,
    totalTravelMin: dayTravelMin,
  };
}

/**
 * Full generation pipeline:
 *   Gemini plans the shape → Google Places supplies real venues/photos →
 *   Google Routes fills travel times → OpenWeather adds the forecast.
 * Each external step degrades gracefully to the model's own estimates.
 *
 * Cost scales with the number of days, so the expensive parts are batched
 * wherever the APIs allow it: one weather request covers the whole range,
 * one Gemini call plans every day, and Places lookups for all days fan out
 * in a single parallel pass rather than day by day.
 */
export async function generateItinerary(
  input: PlannerInput,
  opts?: {
    refinement?: string;
    previous?: PlannedItinerary;
    rec?: CallRecorder;
  }
): Promise<{ itinerary: Itinerary; plan: PlannedItinerary }> {
  const rec = opts?.rec;
  const dates = tripDates(input.date, input.endDate);

  const weatherByDate = await getForecastRange(input.city, dates, rec);
  const plan = await planItinerary(input, weatherByDate, opts);

  // Enrich every stop across every day in one parallel pass. Doing this per
  // day would serialise the Places lookups behind each day's route matrix.
  const flat = plan.days.flatMap((day, dayIdx) =>
    day.stops.map((stop, stopIdx) => ({ day, dayIdx, stop, stopIdx }))
  );

  const enrichedFlat = await Promise.all(
    flat.map(async ({ dayIdx, stop: s, stopIdx }) => {
      const match = await findPlace(s.name, input.city, rec);
      const weekday = new Date(`${dates[dayIdx]}T12:00:00Z`).getUTCDay();

      const stop: ItineraryStop = {
        order: stopIdx + 1,
        name: match?.name ?? s.name,
        category: s.category,
        description: s.description,
        arriveTime: s.arriveTime,
        durationMin: s.durationMin,
        costLow: s.costLow,
        costHigh: s.costHigh,
        isIndoor: s.isIndoor,
        travelToNextMin: s.travelToNextMin,
        travelMode: input.transport,
        placeId: match?.placeId ?? null,
        address: match?.address ?? null,
        lat: match?.lat ?? null,
        lng: match?.lng ?? null,
        rating: match?.rating ?? null,
        photoUrl: photoProxyUrl(match?.photoName ?? null),
        mapsUrl:
          match?.mapsUrl ??
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${s.name} ${input.city}`
          )}`,
        hoursNote: dayHoursText(match?.weekdayText ?? null, weekday),
        openAtArrival: null,
      };
      return { dayIdx, stop, periods: match?.openingPeriods ?? null };
    })
  );

  // Regroup the flattened results back into days.
  const byDay = plan.days.map(() => ({
    stops: [] as ItineraryStop[],
    periods: [] as (OpeningPeriod[] | null)[],
  }));
  for (const e of enrichedFlat) {
    byDay[e.dayIdx].stops.push(e.stop);
    byDay[e.dayIdx].periods.push(e.periods);
  }

  // Each day's route matrix is independent, so run them concurrently.
  const days = await Promise.all(
    plan.days.map((day, i) =>
      buildDay(
        {
          dayIndex: i + 1,
          date: dates[i],
          theme: day.theme,
          stops: byDay[i].stops,
          periods: byDay[i].periods,
          weather: weatherByDate[dates[i]] ?? {
            tempF: null,
            condition: null,
            icon: null,
            isAvailable: false,
          },
        },
        input,
        rec
      )
    )
  );

  const estCostLow = days.reduce((sum, d) => sum + (d.estCostLow ?? 0), 0);
  const estCostHigh = days.reduce((sum, d) => sum + (d.estCostHigh ?? 0), 0);

  const itinerary: Itinerary = {
    title: plan.title,
    summary: plan.summary,
    input,
    days,
    estCostLow: estCostLow || null,
    estCostHigh: estCostHigh || null,
    durationHours: diffHours(input.timeStart, input.timeEnd),
    weather: days[0]?.weather ?? {
      tempF: null,
      condition: null,
      icon: null,
      isAvailable: false,
    },
  };

  return { itinerary, plan };
}
