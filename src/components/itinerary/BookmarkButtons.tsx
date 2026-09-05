"use client";

import { useState } from "react";
import { Heart, Bookmark, Loader2 } from "lucide-react";
import type { ItineraryStop } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Favourite or save an individual venue from an itinerary.
 *
 * Both controls are real toggles over `place_id`: pressing again removes the
 * bookmark. They also start from the user's actual saved state rather than
 * from `false`, so a place favourited last week still shows as favourited.
 *
 * Failures are surfaced. The previous version did `if (res.ok) setFav(true)`
 * with no else, so a 401 or a network error looked exactly like a button
 * that did nothing — and not one bookmark was ever recorded.
 */
export function BookmarkButtons({
  stop,
  city,
  initialFavorited = false,
  initialSaved = false,
}: {
  stop: ItineraryStop;
  city: string;
  initialFavorited?: boolean;
  initialSaved?: boolean;
}) {
  const [fav, setFav] = useState(initialFavorited);
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState<"favorites" | "saved" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(kind: "favorites" | "saved") {
    const isOn = kind === "favorites" ? fav : saved;
    const setOn = kind === "favorites" ? setFav : setSaved;

    // Optimistic: the control responds immediately and rolls back if the
    // request fails, so it never sits inert waiting on the network.
    setOn(!isOn);
    setBusy(kind);
    setError(null);

    try {
      const res = isOn
        ? await fetch(
            `/api/bookmarks?kind=${kind}&placeId=${encodeURIComponent(stop.placeId ?? "")}`,
            { method: "DELETE" }
          )
        : await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind,
              place: {
                placeId: stop.placeId,
                name: stop.name,
                category: stop.category,
                city,
                photoUrl: stop.photoUrl,
                address: stop.address,
                mapsUrl: stop.mapsUrl,
              },
            }),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "That didn't work.");
      }
    } catch (e) {
      setOn(isOn); // roll back
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Removing a bookmark keys off place_id, so a stop Places couldn't match
  // can be added but never cleanly removed. Better to not offer it.
  const disabled = !stop.placeId;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => toggle("favorites")}
        disabled={disabled || busy !== null}
        title={
          disabled
            ? "This venue couldn't be matched, so it can't be saved"
            : error ?? (fav ? "Remove from favorites" : "Add to favorites")
        }
        aria-label={fav ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={fav}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border border-line transition hover:border-ink/30 disabled:opacity-40",
          fav && "border-transparent bg-accent-soft",
          error && "border-red-300"
        )}
      >
        {busy === "favorites" ? (
          <Loader2 className="h-4 w-4 animate-spin text-faint" />
        ) : (
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              fav ? "fill-accent text-accent" : "text-faint"
            )}
          />
        )}
      </button>

      <button
        onClick={() => toggle("saved")}
        disabled={disabled || busy !== null}
        title={
          disabled
            ? "This venue couldn't be matched, so it can't be saved"
            : error ?? (saved ? "Remove from saved places" : "Save this place")
        }
        aria-label={saved ? "Remove from saved places" : "Save this place"}
        aria-pressed={saved}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border border-line transition hover:border-ink/30 disabled:opacity-40",
          saved && "border-transparent bg-brand-soft",
          error && "border-red-300"
        )}
      >
        {busy === "saved" ? (
          <Loader2 className="h-4 w-4 animate-spin text-faint" />
        ) : (
          <Bookmark
            className={cn(
              "h-4 w-4 transition-colors",
              saved ? "fill-brand text-brand" : "text-faint"
            )}
          />
        )}
      </button>
    </div>
  );
}
