import { createClient } from "@/lib/supabase/server";
import type { Itinerary, ItineraryStop, WeatherSummary } from "@/lib/types";
import type { TripRow, StopRow } from "@/lib/supabase/database.types";

/** Map DB rows into the shared Itinerary shape used by the UI. */
function toItinerary(trip: TripRow, stops: StopRow[]): Itinerary {
  const orderedStops: ItineraryStop[] = stops
    .sort((a, b) => a.ord - b.ord)
    .map((s) => ({
      order: s.ord,
      name: s.name,
      category: s.category ?? "",
      description: s.description ?? "",
      arriveTime: s.arrive_time ?? "",
      durationMin: s.duration_min ?? 0,
      costLow: s.cost_low,
      costHigh: s.cost_high,
      isIndoor: s.is_indoor ?? false,
      travelToNextMin: s.travel_to_next_min,
      travelMode: s.travel_mode ?? trip.transport,
      placeId: s.place_id,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      rating: s.rating,
      photoUrl: s.photo_url,
      mapsUrl: s.maps_url,
    }));

  function diffHours(start: string, end: string) {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return Math.max(0, Math.round(((eh * 60 + em - (sh * 60 + sm)) / 60) * 10) / 10);
  }

  return {
    id: trip.id,
    title: trip.title,
    summary: trip.summary ?? "",
    input: {
      city: trip.city,
      date: trip.trip_date,
      timeStart: trip.time_start,
      timeEnd: trip.time_end,
      budget: trip.budget,
      travelStyle: trip.travel_style,
      transport: trip.transport,
      interests: trip.interests,
    },
    stops: orderedStops,
    estCostLow: trip.est_cost_low,
    estCostHigh: trip.est_cost_high,
    durationHours: diffHours(trip.time_start, trip.time_end),
    weather: (trip.weather as WeatherSummary) ?? {
      tempF: null,
      condition: null,
      icon: null,
      isAvailable: false,
    },
    createdAt: trip.created_at,
    status: trip.status,
  };
}

export interface TripSummary {
  id: string;
  title: string;
  summary: string;
  city: string;
  date: string;
  status: "upcoming" | "completed";
  travelStyle: string;
  transport: string;
  budget: string;
  stopCount: number;
  coverPhoto: string | null;
}

/** All trips for the current user, newest first. */
export async function getTrips(): Promise<TripSummary[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: trips } = await supabase
    .from("trips")
    .select("*")
    .eq("user_id", user.id)
    .order("trip_date", { ascending: false });

  if (!trips?.length) return [];

  // Pull the first stop's photo per trip for a cover image.
  const ids = trips.map((t) => t.id);
  const { data: stops } = await supabase
    .from("stops")
    .select("trip_id, ord, photo_url")
    .in("trip_id", ids)
    .order("ord", { ascending: true });

  const coverByTrip = new Map<string, string | null>();
  const countByTrip = new Map<string, number>();
  for (const s of stops ?? []) {
    countByTrip.set(s.trip_id, (countByTrip.get(s.trip_id) ?? 0) + 1);
    if (!coverByTrip.has(s.trip_id) && s.photo_url) {
      coverByTrip.set(s.trip_id, s.photo_url);
    }
  }

  return (trips as TripRow[]).map((t) => ({
    id: t.id,
    title: t.title,
    summary: t.summary ?? "",
    city: t.city,
    date: t.trip_date,
    status: t.status,
    travelStyle: t.travel_style,
    transport: t.transport,
    budget: t.budget,
    stopCount: countByTrip.get(t.id) ?? 0,
    coverPhoto: coverByTrip.get(t.id) ?? null,
  }));
}

/** A single trip with its stops, or null if not found / not owned. */
export async function getTrip(id: string): Promise<Itinerary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!trip) return null;

  const { data: stops } = await supabase
    .from("stops")
    .select("*")
    .eq("trip_id", id);

  return toItinerary(trip as TripRow, (stops as StopRow[]) ?? []);
}
