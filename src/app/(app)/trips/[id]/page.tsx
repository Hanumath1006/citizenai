import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Wallet } from "lucide-react";
import { format } from "date-fns";
import { getTrip } from "@/lib/trips";
import { formatCostRange, formatDuration, titleCase } from "@/lib/utils";
import { StopCard } from "@/components/itinerary/StopCard";
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
          {it.input.city} · {format(new Date(it.input.date), "MMM d, yyyy")}
        </span>
        <WeatherBadge weather={it.weather} />
        <span className="rounded-[var(--radius-pill)] bg-line-soft px-3 py-1 text-xs font-medium text-ink-soft">
          {titleCase(it.status ?? "upcoming")}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">
        {it.title}
      </h1>
      <p className="mt-2 text-muted">{it.summary}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat icon={MapPin} label="Stops" value={String(it.stops.length)} />
        <Stat
          icon={Clock}
          label="Duration"
          value={formatDuration(it.durationHours * 60)}
        />
        <Stat
          icon={Wallet}
          label="Est. cost"
          value={formatCostRange(it.estCostLow, it.estCostHigh)}
        />
      </div>

      <div className="mt-8">
        {it.stops.map((stop, i) => (
          <StopCard
            key={`${stop.order}-${stop.name}`}
            stop={stop}
            isLast={i === it.stops.length - 1}
            city={it.input.city}
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
