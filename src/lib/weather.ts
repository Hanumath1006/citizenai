/* ──────────────────────────────────────────────────────────────
   OpenWeather — forecast for the trip city/date.
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

export async function getForecast(
  city: string,
  date: string, // yyyy-mm-dd
  rec?: CallRecorder
): Promise<WeatherSummary> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return UNAVAILABLE;

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

    if (!res.ok) return UNAVAILABLE;
    const data = await res.json();
    interface Slot {
      dt_txt?: string;
      main?: { temp?: number };
      weather?: { main?: string; icon?: string }[];
    }
    const list: Slot[] = data?.list ?? [];
    if (!list.length) return UNAVAILABLE;

    // Prefer the ~midday slot on the requested date.
    const target = `${date} 12:00:00`;
    let best = list.find((e) => e.dt_txt === target);
    if (!best) best = list.find((e) => e.dt_txt?.startsWith(date));
    if (!best) return UNAVAILABLE; // date outside the 5-day window

    const w = best.weather?.[0];
    return {
      tempF: best.main?.temp != null ? Math.round(best.main.temp) : null,
      condition: w?.main ?? null,
      icon: w?.icon ?? null,
      isAvailable: true,
    };
  } catch {
    rec?.recordFlat({
      provider: "weather",
      operation: "forecast",
      unitPrice: PRICING.weatherCall,
      latencyMs: Date.now() - startedAt,
      ok: false,
    });
    return UNAVAILABLE;
  }
}
