/* Hand-maintained types mirroring supabase/migrations/0001_init.sql.
   Regenerate with `supabase gen types typescript` once the CLI is linked. */

export type Budget = "budget" | "moderate" | "premium" | "luxury";
export type TravelStyle = "solo" | "couple" | "family" | "friends";
export type Transport = "walking" | "driving" | "uber" | "public";
export type TripStatus = "upcoming" | "completed";
export type UserRole = "user" | "admin";
export type AccountStatus = "active" | "disabled";
export type ApiProvider = "gemini" | "places" | "routes" | "weather";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  home_city: string | null;
  default_budget: Budget | null;
  default_style: TravelStyle | null;
  default_transport: Transport | null;
  default_interests: string[];
  onboarded: boolean;
  role: UserRole;
  status: AccountStatus;
  last_seen_at: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
}

/** One itinerary generation attempt, saved or not. See 0002_admin_and_usage.sql. */
export interface GenerationRow {
  id: string;
  user_id: string | null;
  trip_id: string | null;
  city: string;
  trip_date: string | null;
  budget: Budget | null;
  travel_style: TravelStyle | null;
  transport: Transport | null;
  interests: string[];
  stop_count: number | null;
  refined: boolean;
  ok: boolean;
  error: string | null;
  duration_ms: number | null;
  cost_usd: number;
  created_at: string;
}

/** One outbound third-party API call. */
export interface ApiEventRow {
  id: number;
  generation_id: string | null;
  user_id: string | null;
  provider: ApiProvider;
  operation: string;
  units: number;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  latency_ms: number | null;
  ok: boolean;
  status_code: number | null;
  created_at: string;
}

export interface AdminAuditRow {
  id: number;
  admin_id: string | null;
  admin_email: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export interface TripRow {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  city: string;
  trip_date: string;
  time_start: string;
  time_end: string;
  budget: Budget;
  travel_style: TravelStyle;
  transport: Transport;
  interests: string[];
  est_cost_low: number | null;
  est_cost_high: number | null;
  weather: unknown | null;
  status: TripStatus;
  created_at: string;
  updated_at: string;
}

export interface StopRow {
  id: string;
  trip_id: string;
  ord: number;
  name: string;
  category: string | null;
  description: string | null;
  arrive_time: string | null;
  duration_min: number | null;
  cost_low: number | null;
  cost_high: number | null;
  is_indoor: boolean | null;
  travel_to_next_min: number | null;
  travel_mode: Transport | null;
  place_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  photo_url: string | null;
  maps_url: string | null;
}

export interface PlaceBookmarkRow {
  id: string;
  user_id: string;
  place_id: string | null;
  name: string;
  category: string | null;
  city: string | null;
  photo_url: string | null;
  address: string | null;
  maps_url: string | null;
  note?: string | null;
  created_at: string;
}
