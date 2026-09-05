import {
  Clock,
  MapPin,
  Star,
  Footprints,
  Home,
  Trees,
  DoorOpen,
  AlertTriangle,
} from "lucide-react";
import type { ItineraryStop } from "@/lib/types";
import { formatTime, formatDuration, formatCostRange } from "@/lib/utils";
import { Tag } from "@/components/ui/primitives";
import { BookmarkButtons } from "@/components/itinerary/BookmarkButtons";

export function StopCard({
  stop,
  isLast,
  city,
  favoritedPlaceIds,
  savedPlaceIds,
}: {
  stop: ItineraryStop;
  isLast: boolean;
  city: string;
  /** Place ids the user has already favourited/saved, for initial state. */
  favoritedPlaceIds?: ReadonlySet<string>;
  savedPlaceIds?: ReadonlySet<string>;
}) {
  return (
    <div className="relative">
      <div className="flex gap-4">
        {/* Order marker + connector */}
        <div className="flex flex-col items-center">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-semibold text-white">
            {stop.order}
          </span>
          {!isLast && <span className="mt-1 w-px flex-1 bg-line" />}
        </div>

        {/* Card */}
        <div className="min-w-0 flex-1 pb-8">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
            {stop.photoUrl && (
              <div className="relative h-48 w-full bg-line-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stop.photoUrl}
                  alt={stop.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute left-3 top-3">
                  <Tag tone="neutral" className="bg-white/90 backdrop-blur">
                    {stop.isIndoor ? (
                      <Home className="h-3 w-3" />
                    ) : (
                      <Trees className="h-3 w-3" />
                    )}
                    {stop.isIndoor ? "Indoor" : "Outdoor"}
                  </Tag>
                </div>
              </div>
            )}

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-faint">
                    {stop.category}
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold">{stop.name}</h3>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {formatTime(stop.arriveTime)}
                  </span>
                  <BookmarkButtons
                    stop={stop}
                    city={city}
                    initialFavorited={Boolean(
                      stop.placeId && favoritedPlaceIds?.has(stop.placeId)
                    )}
                    initialSaved={Boolean(
                      stop.placeId && savedPlaceIds?.has(stop.placeId)
                    )}
                  />
                </div>
              </div>

              <p className="mt-2 text-sm leading-relaxed text-muted">
                {stop.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDuration(stop.durationMin)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {formatCostRange(stop.costLow, stop.costHigh)}
                </span>
                {stop.rating != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                    {stop.rating.toFixed(1)}
                  </span>
                )}
                {stop.hoursNote && (
                  <span className="inline-flex items-center gap-1.5">
                    <DoorOpen className="h-3.5 w-3.5" />
                    {stop.hoursNote}
                  </span>
                )}
                {stop.mapsUrl && (
                  <a
                    href={stop.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-brand hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Open in Maps
                  </a>
                )}
              </div>

              {stop.openAtArrival === false && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  May be closed at {formatTime(stop.arriveTime)} — check hours
                </div>
              )}
            </div>
          </div>

          {/* Travel to next */}
          {!isLast && stop.travelToNextMin != null && stop.travelToNextMin > 0 && (
            <div className="mt-3 flex items-center gap-2 pl-1 text-xs text-faint">
              <Footprints className="h-3.5 w-3.5" />
              {formatDuration(stop.travelToNextMin)} to next stop
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
