/* ──────────────────────────────────────────────────────────────
   Shared domain types for CitizenAI.
   These describe the itinerary contract between the generation
   pipeline, the API, the database, and the UI.
   ────────────────────────────────────────────────────────────── */

export type Budget = "budget" | "moderate" | "premium" | "luxury";
export type TravelStyle = "solo" | "couple" | "family" | "friends";
export type Transport = "walking" | "driving" | "uber" | "public";

export const INTERESTS = [
  "Coffee",
  "Food & Dining",
  "Museums",
  "Art & Galleries",
  "Nightlife",
  "Live Music",
  "Hiking & Nature",
  "Shopping",
  "Sports",
  "History",
  "Rooftops & Views",
  "Hidden Gems",
] as const;

export type Interest = (typeof INTERESTS)[number];

export const BUDGET_LABELS: Record<Budget, string> = {
  budget: "Budget · $",
  moderate: "Moderate · $$",
  premium: "Premium · $$$",
  luxury: "Luxury · $$$$",
};

export const TRANSPORT_LABELS: Record<Transport, string> = {
  walking: "Walking",
  driving: "Driving",
  uber: "Uber / Taxi",
  public: "Public transit",
};

/**
 * Longest trip the planner will build in one go.
 *
 * Each extra day is another set of Places lookups and another route matrix,
 * so cost and latency both grow linearly. Seven keeps a full week in reach
 * while staying inside the serverless timeout.
 */
export const MAX_TRIP_DAYS = 7;

/** The raw form the user submits from the planner. */
export interface PlannerInput {
  city: string;
  date: string; // yyyy-mm-dd — first day of the trip
  /** Last day, inclusive. Equal to `date` for a single-day outing. */
  endDate: string; // yyyy-mm-dd
  timeStart: string; // HH:mm 24h — daily window, applied to every day
  timeEnd: string; // HH:mm 24h
  budget: Budget;
  travelStyle: TravelStyle;
  transport: Transport;
  interests: string[];
}

/** Every date in a trip's range, inclusive, as yyyy-mm-dd. */
export function tripDates(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  // Parsed at midday UTC so a timezone offset can never roll a date over.
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const last = new Date(`${endDate}T12:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(last.getTime())) {
    return [startDate];
  }
  while (cursor <= last && out.length < MAX_TRIP_DAYS) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out.length ? out : [startDate];
}

/** Inclusive day count for a range, clamped to the supported maximum. */
export function tripDayCount(startDate: string, endDate: string): number {
  return tripDates(startDate, endDate).length;
}

/**
 * Inclusive day count with no clamping — what the user actually asked for.
 *
 * Validation needs this rather than `tripDayCount`, which caps at
 * MAX_TRIP_DAYS and so can never report an over-long range.
 */
export function requestedDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00Z`).getTime();
  const end = new Date(`${endDate}T12:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

/** One stop in a generated itinerary, enriched with real venue data. */
export interface ItineraryStop {
  order: number;
  name: string;
  category: string; // e.g. "Coffee", "Museum"
  description: string; // why this stop, tailored to the traveller
  arriveTime: string; // HH:mm
  durationMin: number;
  costLow: number | null;
  costHigh: number | null;
  isIndoor: boolean;
  travelToNextMin: number | null; // travel time to the following stop
  travelMode: Transport;
  // Enrichment from Google Places (null until resolved)
  placeId: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  photoUrl: string | null;
  mapsUrl: string | null;
  /** Human-readable opening hours for the trip day, e.g. "Open 5:00 PM – 2:00 AM". */
  hoursNote?: string | null;
  /** Whether the venue is open at the planned arrival time (null = unknown). */
  openAtArrival?: boolean | null;
}

export interface WeatherSummary {
  tempF: number | null;
  condition: string | null; // "Sunny", "Overcast", ...
  icon: string | null; // OpenWeather icon code
  isAvailable: boolean; // false when the date is beyond forecast range
}

/**
 * One day of a trip. A single-day outing is a trip with exactly one of
 * these, so the rest of the app never needs a special case for it.
 */
export interface ItineraryDay {
  /** 1-based position in the trip. */
  dayIndex: number;
  date: string; // yyyy-mm-dd
  /** Short label for the day's character, e.g. "Old town & harbour". */
  theme: string;
  stops: ItineraryStop[];
  estCostLow: number | null;
  estCostHigh: number | null;
  weather: WeatherSummary;
  /** True when this day's stops were reordered by the route optimizer. */
  optimized?: boolean;
  /** Total travel time across this day, in minutes. */
  totalTravelMin?: number;
}

/** A complete generated (and possibly saved) itinerary. */
export interface Itinerary {
  id?: string;
  title: string;
  summary: string;
  input: PlannerInput;
  /** Always at least one day. The canonical home for stops. */
  days: ItineraryDay[];
  estCostLow: number | null;
  estCostHigh: number | null;
  /** Hours available per day, from the daily time window. */
  durationHours: number;
  /** Forecast for the first day — the headline shown on cards. */
  weather: WeatherSummary;
  createdAt?: string;
  status?: "upcoming" | "completed";
}

/** Every stop across every day, in trip order. */
export function allStops(itinerary: Itinerary): ItineraryStop[] {
  return itinerary.days.flatMap((d) => d.stops);
}

/** True when any day of the trip was route-optimized. */
export function isOptimized(itinerary: Itinerary): boolean {
  return itinerary.days.some((d) => d.optimized);
}

/** Total travel time across the whole trip, in minutes. */
export function totalTravelMin(itinerary: Itinerary): number {
  return itinerary.days.reduce((sum, d) => sum + (d.totalTravelMin ?? 0), 0);
}

/** Refinement chips shown on the result page. */
export const REFINEMENTS = [
  "More budget-friendly",
  "More adventurous",
  "More relaxed",
  "More food-focused",
  "Indoor only",
  "Hidden gems",
] as const;
