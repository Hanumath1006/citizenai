import { format } from "date-fns";
import { Route, Wallet } from "lucide-react";
import type { ItineraryDay } from "@/lib/types";
import { formatCostRange, formatDuration } from "@/lib/utils";
import { StopCard } from "@/components/itinerary/StopCard";
import { WeatherBadge } from "@/components/itinerary/WeatherBadge";

/**
 * One day of an itinerary, with its own header.
 *
 * Shared by the result page and the saved trip page so a day looks identical
 * before and after saving. The header is suppressed for single-day outings,
 * where the page heading already carries the date and a "Day 1 of 1" label
 * would be noise.
 */
export function DayItinerary({
  day,
  city,
  showHeader,
}: {
  day: ItineraryDay;
  city: string;
  showHeader: boolean;
}) {
  const dayCost = formatCostRange(day.estCostLow, day.estCostHigh);

  return (
    <section aria-label={`Day ${day.dayIndex}`}>
      {showHeader && (
        <header
          id={`day-${day.dayIndex}`}
          className="sticky top-0 z-20 -mx-5 mb-4 border-b border-line bg-canvas/85 px-5 py-3 backdrop-blur-sm"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex h-7 shrink-0 items-center rounded-[var(--radius-pill)] bg-ink px-3 text-xs font-semibold text-white">
              Day {day.dayIndex}
            </span>
            <span className="text-sm font-medium">
              {format(new Date(`${day.date}T12:00:00Z`), "EEEE, MMM d")}
            </span>
            {day.theme && (
              <span className="text-sm text-muted">· {day.theme}</span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
            <WeatherBadge weather={day.weather} />
            {day.stops.length > 0 && (
              <span>
                {day.stops.length} stop{day.stops.length === 1 ? "" : "s"}
              </span>
            )}
            {dayCost !== "—" && (
              <span className="inline-flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" />
                {dayCost}
              </span>
            )}
            {day.optimized && (
              <span className="inline-flex items-center gap-1 text-brand">
                <Route className="h-3.5 w-3.5" />
                Route-optimized
                {day.totalTravelMin ? ` · ${formatDuration(day.totalTravelMin)}` : ""}
              </span>
            )}
          </div>
        </header>
      )}

      {day.stops.map((stop, i) => (
        <StopCard
          key={`${day.dayIndex}-${stop.order}-${stop.name}`}
          stop={stop}
          isLast={i === day.stops.length - 1}
          city={city}
        />
      ))}
    </section>
  );
}

/**
 * Jump links across a multi-day trip. Rendered only when there is more than
 * one day, since a single-day trip has nowhere to jump to.
 */
export function DayNav({ days }: { days: ItineraryDay[] }) {
  if (days.length < 2) return null;

  return (
    <nav
      aria-label="Jump to day"
      className="flex flex-wrap gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-3"
    >
      {days.map((day) => (
        <a
          key={day.dayIndex}
          href={`#day-${day.dayIndex}`}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-pill)] border border-line px-3.5 text-sm font-medium text-ink-soft transition-colors hover:border-ink/30 hover:bg-line-soft hover:text-ink"
        >
          <span className="text-faint">Day {day.dayIndex}</span>
          <span>{format(new Date(`${day.date}T12:00:00Z`), "MMM d")}</span>
        </a>
      ))}
    </nav>
  );
}
