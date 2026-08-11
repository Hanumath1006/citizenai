/* ──────────────────────────────────────────────────────────────
   Google Places API (New) — venue lookup + photo proxying.
   All calls are best-effort: on failure they resolve to null so the
   itinerary still renders with the AI's own estimates.
   ────────────────────────────────────────────────────────────── */

const PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

/** A single open→close interval from Google (day: 0=Sunday … 6=Saturday). */
export interface OpeningPeriod {
  open: { day: number; hour: number; minute: number };
  close?: { day: number; hour: number; minute: number };
}

export interface PlaceMatch {
  placeId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  photoName: string | null; // Google photo resource name
  mapsUrl: string | null;
  openingPeriods: OpeningPeriod[] | null;
  weekdayText: string[] | null; // Google weekdayDescriptions (Monday-first)
}

function key() {
  return process.env.GOOGLE_MAPS_API_KEY;
}

/**
 * Look up the best-matching real venue for a stop name in a city.
 * Returns null if Places is unavailable or nothing matches.
 */
export async function findPlace(
  query: string,
  city: string
): Promise<PlaceMatch | null> {
  const apiKey = key();
  if (!apiKey) return null;

  try {
    const res = await fetch(PLACES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.googleMapsUri,places.regularOpeningHours",
      },
      body: JSON.stringify({
        textQuery: `${query}, ${city}`,
        maxResultCount: 1,
        languageCode: "en",
      }),
      // Places data changes slowly; cache briefly to save quota.
      next: { revalidate: 60 * 60 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const p = data?.places?.[0];
    if (!p) return null;

    const hours = p.regularOpeningHours;
    return {
      placeId: p.id,
      name: p.displayName?.text ?? query,
      address: p.formattedAddress ?? null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: typeof p.rating === "number" ? p.rating : null,
      photoName: p.photos?.[0]?.name ?? null,
      mapsUrl: p.googleMapsUri ?? null,
      openingPeriods: Array.isArray(hours?.periods) ? hours.periods : null,
      weekdayText: Array.isArray(hours?.weekdayDescriptions)
        ? hours.weekdayDescriptions
        : null,
    };
  } catch {
    return null;
  }
}

/**
 * Build the URL to our own photo proxy so the API key never reaches the
 * browser. Returns null when there is no photo.
 */
export function photoProxyUrl(photoName: string | null, width = 1200) {
  if (!photoName) return null;
  return `/api/photo?name=${encodeURIComponent(photoName)}&w=${width}`;
}

/** Fetch the raw photo bytes from Google (used by the proxy route). */
export async function fetchPhotoBytes(
  photoName: string,
  width: number
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const apiKey = key();
  if (!apiKey) return null;
  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${width}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    return {
      body: await res.arrayBuffer(),
      contentType: res.headers.get("content-type") ?? "image/jpeg",
    };
  } catch {
    return null;
  }
}
