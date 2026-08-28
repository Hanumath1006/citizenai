import type { Itinerary, ItineraryStop, PlannerInput } from "@/lib/types";
import type { OpeningPeriod } from "@/lib/google/places";
import { getForecast } from "@/lib/weather";
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
  total = Math.min(total, 23 * 60 + 59);
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
 * Full generation pipeline:
 *   Gemini plans the shape → Google Places supplies real venues/photos →
 *   Google Routes fills travel times → OpenWeather adds the forecast.
 * Each external step degrades gracefully to the model's own estimates.
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
  const weather = await getForecast(input.city, input.date, rec);
  const plan = await planItinerary(input, weather, opts);

  // Weekday of the trip (0=Sunday … 6=Saturday), used for hours lookups.
  const weekday = new Date(`${input.date}T12:00:00`).getDay();

  // Enrich each stop with real venue data + opening hours (in parallel).
  const enrichedRaw = await Promise.all(
    plan.stops.map(async (s, i) => {
      const match = await findPlace(s.name, input.city, rec);
      const stop: ItineraryStop = {
        order: i + 1,
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
      return { stop, periods: match?.openingPeriods ?? null };
    })
  );

  const enriched = enrichedRaw.map((e) => e.stop);
  const periodsByIndex = enrichedRaw.map((e) => e.periods);
  const periodsByStop = new Map<ItineraryStop, OpeningPeriod[] | null>();
  enrichedRaw.forEach((e) => periodsByStop.set(e.stop, e.periods));

  // Route-optimize the sequence when every stop has coordinates and the
  // transport mode supports a travel-time matrix (walking/driving/uber).
  // Candidate orders must keep every venue OPEN at arrival and within its
  // intended time-of-day slot, so optimization never breaks the day's arc.
  let stops = enriched;
  let optimized = false;
  let totalTravelMin: number | undefined;

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
          if (isOpenAt(periodsByIndex[idx], weekday, arr[k]) === false) {
            return false;
          }
        }
        return true;
      };

      const { order, valid } = bestOrder(matrix, isValid);
      if (valid) {
        const result = applyOptimizedOrder(enriched, order, matrix);
        stops = result.stops;
        totalTravelMin = result.totalTravel;
        optimized = true;
      } else {
        // No reorder respects both timing and hours — keep the planner's
        // order (and its times), just refresh consecutive travel from the matrix.
        for (let i = 0; i < enriched.length - 1; i++) {
          const leg = matrix[i][i + 1];
          if (Number.isFinite(leg)) enriched[i].travelToNextMin = leg;
        }
        enriched[enriched.length - 1].travelToNextMin = 0;
        totalTravelMin = enriched.reduce(
          (sum, s) => sum + (s.travelToNextMin ?? 0),
          0
        );
      }
    }
  }

  // Fallback (transit, missing coords, or matrix unavailable): keep the AI's
  // order and fill consecutive travel times with per-leg Routes calls.
  if (!optimized && totalTravelMin === undefined) {
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
    totalTravelMin = stops.reduce(
      (sum, s) => sum + (s.travelToNextMin ?? 0),
      0
    );
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

  const itinerary: Itinerary = {
    title: plan.title,
    summary: plan.summary,
    input,
    stops,
    estCostLow: costLow || null,
    estCostHigh: costHigh || null,
    durationHours: diffHours(input.timeStart, input.timeEnd),
    weather,
    optimized,
    totalTravelMin,
  };

  return { itinerary, plan };
}
