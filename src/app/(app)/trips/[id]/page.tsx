import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Wallet, CalendarDays } from "lucide-react";
import { getTrip } from "@/lib/trips";
import { getBookmarkedPlaceIds } from "@/lib/bookmarks";
import {
  formatCostRange,
  formatDuration,
  titleCase,
  dateRangeLabel,
} from "@/lib/utils";
import { DayItinerary, DayNav } from "@/components/itinerary/DayItinerary";
import { WeatherBadge } from "@/components/itinerary/WeatherBadge";
import { DeleteTripButton } from "@/components/trips/DeleteTripButton";
import { CompleteTripButton } from "@/components/trips/CompleteTripButton";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const it = await getTrip(id);
  if (!it) notFound();

  // Read on the server so the hearts render in their true state on first
  // paint, with no flash of "not favourited".
  const [favoritedPlaceIds, savedPlaceIds] = await Promise.all([
    getBookmarkedPlaceIds("favorites"),
    getBookmarkedPlaceIds("saved_places"),
  ]);

  const multiDay = it.days.length > 1;
  const stopCount = it.days.reduce((n, d) => n + d.stops.length, 0);

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <div className="mb-5 flex items-center justify-between">
        <Link
          href="/trips"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> All trips
        </Link>
        <DeleteTripButton id={id} />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-faint">
        <span className="uppercase tracking-wide">
          {it.input.city} · {dateRangeLabel(it.input.date, it.input.endDate)}
        </span>
        {!multiDay && <WeatherBadge weather={it.weather} />}
        <span className="rounded-[var(--radius-pill)] bg-line-soft px-3 py-1 text-xs font-medium text-ink-soft">
          {titleCase(it.status ?? "upcoming")}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
        {it.title}
      </h1>
      <p className="mt-2 text-muted">{it.summary}</p>

      <div
        className={`mt-6 grid gap-3 ${multiDay ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
      >
        {multiDay && (
          <Stat
            icon={CalendarDays}
            label="Days"
            value={String(it.days.length)}
          />
        )}
        <Stat icon={MapPin} label="Stops" value={String(stopCount)} />
        <Stat
          icon={Clock}
          label={multiDay ? "Hours/day" : "Duration"}
          value={formatDuration(it.durationHours * 60)}
        />
        <Stat
          icon={Wallet}
          label={multiDay ? "Est. total" : "Est. cost"}
          value={formatCostRange(it.estCostLow, it.estCostHigh)}
        />
      </div>

      {multiDay && (
        <div className="mt-6">
          <DayNav days={it.days} />
        </div>
      )}

      <div className="mt-8 space-y-10">
        {it.days.map((day) => (
          <DayItinerary
            key={day.dayIndex}
            day={day}
            city={it.input.city}
            showHeader={multiDay}
            favoritedPlaceIds={favoritedPlaceIds}
            savedPlaceIds={savedPlaceIds}
          />
        ))}
      </div>

      {/* Closing action, reached by scrolling past the last stop. */}
      <div className="mt-8">
        <CompleteTripButton id={id} status={it.status ?? "upcoming"} />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4 text-center">
      <Icon className="mx-auto h-4 w-4 text-faint" />
      <p className="mt-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-faint">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
