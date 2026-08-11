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

/** The raw form the user submits from the planner. */
export interface PlannerInput {
  city: string;
  date: string; // yyyy-mm-dd
  timeStart: string; // HH:mm 24h
  timeEnd: string; // HH:mm 24h
  budget: Budget;
  travelStyle: TravelStyle;
  transport: Transport;
  interests: string[];
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

/** A complete generated (and possibly saved) itinerary. */
export interface Itinerary {
  id?: string;
  title: string;
  summary: string;
  input: PlannerInput;
  stops: ItineraryStop[];
  estCostLow: number | null;
  estCostHigh: number | null;
  durationHours: number;
  weather: WeatherSummary;
  /** True when stops were reordered by the route optimizer. */
  optimized?: boolean;
  /** Total travel time across the sequence, in minutes. */
  totalTravelMin?: number;
  createdAt?: string;
  status?: "upcoming" | "completed";
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
