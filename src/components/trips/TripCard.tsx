import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import type { TripSummary } from "@/lib/trips";
import { BUDGET_LABELS, TRANSPORT_LABELS } from "@/lib/types";
import type { Budget, Transport } from "@/lib/types";
import { titleCase, dateRangeLabel } from "@/lib/utils";
import { Tag } from "@/components/ui/primitives";
import { TripDoneToggle } from "@/components/trips/CompleteTripButton";

/**
 * The card carries its own "mark done" control, so an outing can be filed
 * away from the dashboard without opening it.
 *
 * That means the card can no longer be a single <Link> wrapper — an anchor
 * may not contain a button. Instead the link is an empty overlay stretched
 * across the card, and the toggle sits above it on a higher layer.
 */
export function TripCard({ trip }: { trip: TripSummary }) {
  return (
    <div className="group relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-float)] focus-within:ring-2 focus-within:ring-ink/20">
      {/* Stretched link: makes the whole card clickable without nesting
          interactive elements inside an anchor. */}
      <Link
        href={`/trips/${trip.id}`}
        className="absolute inset-0 z-10 focus:outline-none"
        aria-label={`Open trip: ${trip.title}`}
      />

      <div className="relative h-40 bg-line-soft">
        {trip.coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.coverPhoto}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-faint">
            <MapPin className="h-8 w-8" />
          </div>
        )}
        <div className="absolute right-3 top-3">
          <Tag
            tone={trip.status === "upcoming" ? "brand" : "neutral"}
            className="bg-white/90 backdrop-blur"
          >
            {titleCase(trip.status)}
          </Tag>
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-medium text-faint">
          {trip.city} · {dateRangeLabel(trip.date, trip.endDate)}
          {trip.dayCount > 1 && ` · ${trip.dayCount} days`}
        </p>
        <h3 className="mt-1 line-clamp-1 text-base font-semibold">
          {trip.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
          {trip.summary}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-faint">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {titleCase(trip.travelStyle)}
            </span>
            <span>{TRANSPORT_LABELS[trip.transport as Transport]}</span>
            <span>{BUDGET_LABELS[trip.budget as Budget]?.split(" · ")[1]}</span>
          </div>

          <TripDoneToggle id={trip.id} status={trip.status} />
        </div>
      </div>
    </div>
  );
}
