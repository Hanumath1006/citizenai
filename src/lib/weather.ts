/* ──────────────────────────────────────────────────────────────
   OpenWeather — forecast for the trip city/dates.
   Uses the free 5-day / 3-hour forecast. For dates beyond that
   window we return isAvailable:false and the plan proceeds without
   weather steering.
   ────────────────────────────────────────────────────────────── */

import type { WeatherSummary } from "@/lib/types";
import { PRICING } from "@/lib/usage/pricing";
import type { CallRecorder } from "@/lib/usage/types";

const UNAVAILABLE: WeatherSummary = {
  tempF: null,
  condition: null,
  icon: null,
  isAvailable: false,
};

interface Slot {
  dt_txt?: string;
  main?: { temp?: number };
  weather?: { main?: string; icon?: string }[];
}

/**
 * One call to the 5-day forecast, returning every 3-hourly slot.
 *
 * A whole trip's weather comes out of a single request: the endpoint
 * already returns five days, so fetching per-day would mean paying for
 * (and rate-limiting on) N identical responses.
 */
async function fetchSlots(
  city: string,
  rec?: CallRecorder
): Promise<Slot[] | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  const startedAt = Date.now();
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      city
    )}&units=imperial&appid=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 3 } });

    rec?.recordFlat({
      provider: "weather",
      operation: "forecast",
      unitPrice: PRICING.weatherCall,
      latencyMs: Date.now() - startedAt,
      ok: res.ok,
      statusCode: res.status,
    });

    if (!res.ok) return null;
    const data = await res.json();
    const list: Slot[] = data?.list ?? [];
    return list.length ? list : null;
  } catch {
    rec?.recordFlat({
      provider: "weather",
      operation: "forecast",
      unitPrice: PRICING.weatherCall,
      latencyMs: Date.now() - startedAt,
      ok: false,
    });
    return null;
  }
}

/** Pick the ~midday slot for a date and summarise it. */
function summarise(slots: Slot[], date: string): WeatherSummary {
  const target = `${date} 12:00:00`;
  const best =
    slots.find((e) => e.dt_txt === target) ??
    slots.find((e) => e.dt_txt?.startsWith(date));

  // Date sits outside the 5-day window.
  if (!best) return UNAVAILABLE;

  const w = best.weather?.[0];
  return {
    tempF: best.main?.temp != null ? Math.round(best.main.temp) : null,
    condition: w?.main ?? null,
    icon: w?.icon ?? null,
    isAvailable: true,
  };
}

/** Forecast for a single date. */
export async function getForecast(
  city: string,
  date: string, // yyyy-mm-dd
  rec?: CallRecorder
): Promise<WeatherSummary> {
  const slots = await fetchSlots(city, rec);
  if (!slots) return UNAVAILABLE;
  return summarise(slots, date);
}

/**
 * Forecast for every date in a trip, from one request. Dates beyond the
 * five-day window come back unavailable, which the planner treats as
 * "no weather steering" rather than an error.
 */
export async function getForecastRange(
  city: string,
  dates: string[],
  rec?: CallRecorder
): Promise<Record<string, WeatherSummary>> {
  const slots = await fetchSlots(city, rec);
  const out: Record<string, WeatherSummary> = {};
  for (const date of dates) {
    out[date] = slots ? summarise(slots, date) : UNAVAILABLE;
  }
  return out;
}
