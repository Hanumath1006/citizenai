/* ──────────────────────────────────────────────────────────────
   Google Routes API — travel time between two points for a mode.
   Best-effort: returns null on any failure so the caller can fall
   back to the AI's estimated travel time.
   ────────────────────────────────────────────────────────────── */

import type { Transport } from "@/lib/types";
import { PRICING } from "@/lib/usage/pricing";
import type { CallRecorder } from "@/lib/usage/types";

const ROUTES_ENDPOINT =
  "https://routes.googleapis.com/directions/v2:computeRoutes";
const MATRIX_ENDPOINT =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

type LatLng = { lat: number; lng: number };

function travelMode(transport: Transport): string {
  switch (transport) {
    case "walking":
      return "WALK";
    case "public":
      return "TRANSIT";
    case "driving":
    case "uber":
    default:
      return "DRIVE";
  }
}

/** Route Matrix supports DRIVE / WALK / BICYCLE / TWO_WHEELER — not TRANSIT. */
export function supportsMatrix(transport: Transport): boolean {
  return travelMode(transport) !== "TRANSIT";
}

interface MatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string; // e.g. "720s"
  condition?: string; // "ROUTE_EXISTS" | "ROUTE_NOT_FOUND"
}

/**
 * Full NxN travel-time matrix (minutes) between the given points for a mode,
 * via one Compute Route Matrix request. Returns null if unavailable (no key,
 * transit mode, <2 points, or an API error) so the caller can skip optimizing.
 * Unreachable pairs are left as Infinity.
 */
export async function travelMatrix(
  points: LatLng[],
  transport: Transport,
  rec?: CallRecorder
): Promise<number[][] | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  if (!supportsMatrix(transport)) return null;
  if (points.length < 2) return null;

  // Route Matrix bills per element, not per request: an NxN matrix is N²
  // billable elements. Charging it as one call would understate Maps spend
  // by roughly an order of magnitude on a 5-stop day.
  const elements = points.length * points.length;
  const startedAt = Date.now();

  try {
    const waypoints = points.map((p) => ({
      waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } },
    }));

    const res = await fetch(MATRIX_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "originIndex,destinationIndex,duration,condition",
      },
      body: JSON.stringify({
        origins: waypoints,
        destinations: waypoints,
        travelMode: travelMode(transport),
      }),
    });

    rec?.recordFlat({
      provider: "routes",
      operation: "compute_route_matrix",
      unitPrice: PRICING.routesElement,
      units: elements,
      latencyMs: Date.now() - startedAt,
      ok: res.ok,
      statusCode: res.status,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(
        `[routes] matrix failed — HTTP ${res.status}: ${detail.slice(0, 400)}`
      );
      return null;
    }
    const data = (await res.json()) as MatrixElement[];
    if (!Array.isArray(data)) return null;

    const n = points.length;
    const m: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) m[i][i] = 0;

    for (const el of data) {
      const oi = el.originIndex;
      const di = el.destinationIndex;
      if (typeof oi !== "number" || typeof di !== "number") continue;
      if (el.condition && el.condition !== "ROUTE_EXISTS") continue;
      if (!el.duration) continue;
      const secs = parseInt(el.duration.replace("s", ""), 10);
      if (!Number.isNaN(secs)) m[oi][di] = Math.round(secs / 60);
    }
    return m;
  } catch {
    rec?.recordFlat({
      provider: "routes",
      operation: "compute_route_matrix",
      unitPrice: PRICING.routesElement,
      units: elements,
      latencyMs: Date.now() - startedAt,
      ok: false,
    });
    return null;
  }
}

/** Minutes to travel between two coordinates, or null if unavailable. */
export async function travelMinutes(
  from: LatLng,
  to: LatLng,
  transport: Transport,
  rec?: CallRecorder
): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const startedAt = Date.now();
  try {
    const res = await fetch(ROUTES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration",
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: travelMode(transport),
      }),
    });

    rec?.recordFlat({
      provider: "routes",
      operation: "compute_routes",
      unitPrice: PRICING.routesElement,
      latencyMs: Date.now() - startedAt,
      ok: res.ok,
      statusCode: res.status,
    });

    if (!res.ok) return null;
    const data = await res.json();
    const duration: string | undefined = data?.routes?.[0]?.duration; // e.g. "720s"
    if (!duration) return null;
    const seconds = parseInt(duration.replace("s", ""), 10);
    if (Number.isNaN(seconds)) return null;
    return Math.round(seconds / 60);
  } catch {
    rec?.recordFlat({
      provider: "routes",
      operation: "compute_routes",
      unitPrice: PRICING.routesElement,
      latencyMs: Date.now() - startedAt,
      ok: false,
    });
    return null;
  }
}
