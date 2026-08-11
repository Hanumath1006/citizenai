/* Hand-maintained types mirroring supabase/migrations/0001_init.sql.
   Regenerate with `supabase gen types typescript` once the CLI is linked. */

export type Budget = "budget" | "moderate" | "premium" | "luxury";
export type TravelStyle = "solo" | "couple" | "family" | "friends";
export type Transport = "walking" | "driving" | "uber" | "public";
export type TripStatus = "upcoming" | "completed";

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
  created_at: string;
  updated_at: string;
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
