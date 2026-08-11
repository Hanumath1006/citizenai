import Link from "next/link";
import { MapPin, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { TripSummary } from "@/lib/trips";
import { BUDGET_LABELS, TRANSPORT_LABELS } from "@/lib/types";
import type { Budget, Transport } from "@/lib/types";
import { titleCase } from "@/lib/utils";
import { Tag } from "@/components/ui/primitives";

export function TripCard({ trip }: { trip: TripSummary }) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-float)]"
    >
      <div className="relative h-40 bg-line-soft">
        {trip.coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trip.coverPhoto}
            alt={trip.title}
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
          {trip.city} · {format(new Date(trip.date), "MMM d, yyyy")}
        </p>
        <h3 className="mt-1 line-clamp-1 text-base font-semibold">
          {trip.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
          {trip.summary}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-faint">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {titleCase(trip.travelStyle)}
            </span>
            <span>{TRANSPORT_LABELS[trip.transport as Transport]}</span>
            <span>{BUDGET_LABELS[trip.budget as Budget]?.split(" · ")[1]}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-ink" />
        </div>
      </div>
    </Link>
  );
}
