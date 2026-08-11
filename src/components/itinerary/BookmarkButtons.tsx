"use client";

import { useState } from "react";
import { Heart, Bookmark } from "lucide-react";
import type { ItineraryStop } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookmarkButtons({
  stop,
  city,
}: {
  stop: ItineraryStop;
  city: string;
}) {
  const [fav, setFav] = useState(false);
  const [saved, setSaved] = useState(false);

  async function add(kind: "favorites" | "saved") {
    const res = await fetch("/api/bookmarks", {
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
    if (res.ok) {
      if (kind === "favorites") setFav(true);
      else setSaved(true);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => add("favorites")}
        title="Add to favorites"
        aria-label="Add to favorites"
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border border-line transition hover:border-ink/30",
          fav && "border-transparent bg-accent-soft"
        )}
      >
        <Heart
          className={cn("h-4 w-4", fav ? "fill-accent text-accent" : "text-faint")}
        />
      </button>
      <button
        onClick={() => add("saved")}
        title="Save this place"
        aria-label="Save this place"
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border border-line transition hover:border-ink/30",
          saved && "border-transparent bg-brand-soft"
        )}
      >
        <Bookmark
          className={cn("h-4 w-4", saved ? "fill-brand text-brand" : "text-faint")}
        />
      </button>
    </div>
  );
}
