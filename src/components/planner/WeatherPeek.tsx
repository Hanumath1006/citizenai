"use client";

import { useEffect, useState } from "react";
import type { WeatherSummary } from "@/lib/types";
import { WeatherBadge, iconFor } from "@/components/itinerary/WeatherBadge";

interface DayForecast {
  date: string;
  weather: WeatherSummary;
}

/** "Mon" for a yyyy-mm-dd string, parsed at midday UTC so no offset rolls it. */
function weekdayLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

/**
 * A live forecast on the planner, for the city and dates being typed.
 *
 * The itinerary already shows weather once it exists, which is a beat too
 * late to be useful — by then you have spent a generation. Showing it on the
 * form means "rain, 54°" can talk you into an indoor day before you commit.
 *
 * A date range gets one chip per day, because a trip's weather is rarely
 * uniform and a rainy Wednesday is exactly the thing worth seeing before
 * generating. The whole range still costs one upstream request: OpenWeather's
 * five-day response covers it, and the route slices every day out of the one
 * reply.
 *
 * Renders nothing until there is a real forecast: a blank city, a half-typed
 * name, or dates past the five-day window all resolve to no chip rather than
 * to an error. Weather is a nicety here, never a blocker.
 */
export function WeatherPeek({
  city,
  date,
  endDate,
}: {
  city: string;
  date: string;
  /** Last day, inclusive. Equal to `date` for a single-day outing. */
  endDate: string;
}) {
  const [days, setDays] = useState<DayForecast[] | null>(null);

  useEffect(() => {
    const name = city.trim();
    const last = endDate || date;

    // Partial names just 404 upstream, so wait for enough of one to be worth
    // a request — and for the typing to settle, so "Barcelona" costs one
    // call rather than one per keystroke.
    if (name.length < 3 || !date || last < date) {
      setDays(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/weather?city=${encodeURIComponent(name)}&date=${date}` +
            `&endDate=${last}`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as {
          weather?: WeatherSummary;
          days?: DayForecast[];
        };
        if (cancelled) return;

        // Fall back to the single-day field if `days` is missing, so a stale
        // cached response from the previous shape still renders something.
        setDays(
          data.days ??
            (data.weather ? [{ date, weather: data.weather }] : null)
        );
      } catch {
        // An unknown city or a flaky upstream is not worth a visible error
        // on a form the user can submit perfectly well without it.
        if (!cancelled) setDays(null);
      }
    }, 600);

    return () => {
      // Both guards matter: the timer covers a keystroke landing before the
      // request goes out, `cancelled` covers one landing while it's in
      // flight, which would otherwise paint a stale city's weather.
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, date, endDate]);

  // Days beyond OpenWeather's five-day window come back unavailable. Drop
  // them rather than rendering blanks: a partial forecast is still useful,
  // and a row of empty slots reads like something failed.
  const known = days?.filter((d) => d.weather?.isAvailable) ?? [];
  if (!known.length) return null;

  if (known.length === 1) {
    const singleDay = (endDate || date) === date;
    return (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <WeatherBadge weather={known[0].weather} />
        <span className="text-xs text-faint">
          {singleDay ? "on the day" : "on your first day"}
        </span>
      </div>
    );
  }

  return (
    <div className="pt-1">
      <div className="flex flex-wrap gap-1.5">
        {known.map((d) => {
          const Icon = iconFor(d.weather.condition);
          return (
            <span
              key={d.date}
              title={`${d.date} — ${d.weather.condition ?? "forecast"}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-line bg-surface-raised px-2.5 py-1.5 text-xs text-ink-soft"
            >
              <span className="font-medium text-faint">
                {weekdayLabel(d.date)}
              </span>
              <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
              {d.weather.tempF != null && (
                <span className="font-semibold">{d.weather.tempF}°</span>
              )}
            </span>
          );
        })}
      </div>
      {known.length < (days?.length ?? 0) && (
        <p className="mt-1.5 text-xs text-faint">
          Later days are beyond the forecast window.
        </p>
      )}
    </div>
  );
}
