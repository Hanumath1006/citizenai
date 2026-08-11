"use client";

import { useState } from "react";
import { MapPin, X, ExternalLink } from "lucide-react";
import type { PlaceBookmarkRow } from "@/lib/supabase/database.types";
import { Tag } from "@/components/ui/primitives";

export function BookmarkCard({
  row,
  kind,
}: {
  row: PlaceBookmarkRow;
  kind: "favorites" | "saved";
}) {
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/bookmarks?kind=${kind}&id=${row.id}`, {
      method: "DELETE",
    });
    if (res.ok) setRemoved(true);
    else setBusy(false);
  }

  if (removed) return null;

  return (
    <div className="group overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="relative h-36 bg-line-soft">
        {row.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.photo_url}
            alt={row.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-faint">
            <MapPin className="h-7 w-7" />
          </div>
        )}
        <button
          onClick={remove}
          disabled={busy}
          aria-label="Remove"
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-muted backdrop-blur transition hover:text-red-600 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4">
        {row.category && (
          <Tag tone="neutral" className="mb-2">
            {row.category}
          </Tag>
        )}
        <h3 className="line-clamp-1 font-semibold">{row.name}</h3>
        {row.city && <p className="text-xs text-faint">{row.city}</p>}
        {row.maps_url && (
          <a
            href={row.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Maps
          </a>
        )}
      </div>
    </div>
  );
}
