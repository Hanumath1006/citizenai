"use client";

import { useEffect, useState } from "react";
import type { WeatherSummary } from "@/lib/types";
import { WeatherBadge } from "@/components/itinerary/WeatherBadge";

/**
 * A live forecast chip on the planner, for the city and date being typed.
 *
 * The itinerary already shows weather once it exists, which is a beat too
 * late to be useful — by then you have spent a generation. Showing it on the
 * form means "rain, 54°" can talk you into an indoor day before you commit.
 *
 * Renders nothing until there is a real forecast: a blank city, a half-typed
 * name, or a date past OpenWeather's five-day window all resolve to no chip
 * rather than to an error. Weather is a nicety here, never a blocker.
 */
export function WeatherPeek({
  city,
  date,
  label,
}: {
  city: string;
  date: string;
  /** Trailing note, e.g. "on your first day". */
  label: string;
}) {
  const [weather, setWeather] = useState<WeatherSummary | null>(null);

  useEffect(() => {
    const name = city.trim();

    // Partial names just 404 upstream, so wait for enough of one to be worth
    // a request — and for the typing to settle, so "Barcelona" costs one
    // call rather than one per keystroke.
    if (name.length < 3 || !date) {
      setWeather(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/weather?city=${encodeURIComponent(name)}&date=${date}`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { weather?: WeatherSummary };
        if (!cancelled) setWeather(data.weather ?? null);
      } catch {
        // An unknown city or a flaky upstream is not worth a visible error
        // on a form the user can submit perfectly well without it.
        if (!cancelled) setWeather(null);
      }
    }, 600);

    return () => {
      // Both guards matter: the timer covers a keystroke landing before the
      // request goes out, `cancelled` covers one landing while it's in
      // flight, which would otherwise paint a stale city's weather.
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, date]);

  if (!weather?.isAvailable) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <WeatherBadge weather={weather} />
      <span className="text-xs text-faint">{label}</span>
    </div>
  );
}
