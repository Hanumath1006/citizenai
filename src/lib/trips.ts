import { createClient } from "@/lib/supabase/server";
import type {
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  WeatherSummary,
} from "@/lib/types";
import { tripDates } from "@/lib/types";
import type { TripRow, StopRow } from "@/lib/supabase/database.types";

const NO_WEATHER: WeatherSummary = {
  tempF: null,
  condition: null,
  icon: null,
  isAvailable: false,
};

function toStop(s: StopRow, transport: TripRow["transport"]): ItineraryStop {
  return {
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
    travelMode: s.travel_mode ?? transport,
    placeId: s.place_id,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    rating: s.rating,
    photoUrl: s.photo_url,
    mapsUrl: s.maps_url,
  };
}

/** Map DB rows into the shared Itinerary shape used by the UI. */
function toItinerary(trip: TripRow, stops: StopRow[]): Itinerary {
  const endDate = trip.end_date ?? trip.trip_date;
  const dates = tripDates(trip.trip_date, endDate);

  // Group stops by their day. Rows written before multi-day support all
  // carry day_index 1, so they land on the trip's only day unchanged.
  const byDay = new Map<number, StopRow[]>();
  for (const s of stops) {
    const day = s.day_index ?? 1;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }

  const days: ItineraryDay[] = dates.map((date, i) => {
    const dayIndex = i + 1;
    const rows = (byDay.get(dayIndex) ?? []).sort((a, b) => a.ord - b.ord);
    const dayStops = rows.map((s) => toStop(s, trip.transport));
    const costLow = dayStops.reduce((n, s) => n + (s.costLow ?? 0), 0);
    const costHigh = dayStops.reduce((n, s) => n + (s.costHigh ?? 0), 0);

    return {
      dayIndex,
      date,
      theme: "",
      stops: dayStops,
      estCostLow: costLow || null,
      estCostHigh: costHigh || null,
      // Only the trip-level forecast is persisted, and a stored forecast is
      // stale anyway — it described the weather when the trip was planned.
      weather: dayIndex === 1 ? ((trip.weather as WeatherSummary) ?? NO_WEATHER) : NO_WEATHER,
      totalTravelMin: dayStops.reduce((n, s) => n + (s.travelToNextMin ?? 0), 0),
    };
  });

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
      endDate,
      timeStart: trip.time_start,
      timeEnd: trip.time_end,
      budget: trip.budget,
      travelStyle: trip.travel_style,
      transport: trip.transport,
      interests: trip.interests,
    },
    days,
    estCostLow: trip.est_cost_low,
    estCostHigh: trip.est_cost_high,
    durationHours: diffHours(trip.time_start, trip.time_end),
    weather: (trip.weather as WeatherSummary) ?? NO_WEATHER,
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
  /** Last day of the trip; equals `date` for a single-day outing. */
  endDate: string;
  dayCount: number;
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
    .select("trip_id, ord, day_index, photo_url")
    .in("trip_id", ids)
    .order("day_index", { ascending: true })
    .order("ord", { ascending: true });

  const coverByTrip = new Map<string, string | null>();
  const countByTrip = new Map<string, number>();
  for (const s of stops ?? []) {
    countByTrip.set(s.trip_id, (countByTrip.get(s.trip_id) ?? 0) + 1);
    if (!coverByTrip.has(s.trip_id) && s.photo_url) {
      coverByTrip.set(s.trip_id, s.photo_url);
    }
  }

  return (trips as TripRow[]).map((t) => {
    const endDate = t.end_date ?? t.trip_date;
    return {
      id: t.id,
      title: t.title,
      summary: t.summary ?? "",
      city: t.city,
      date: t.trip_date,
      endDate,
      dayCount: tripDates(t.trip_date, endDate).length,
      status: t.status,
      travelStyle: t.travel_style,
      transport: t.transport,
      budget: t.budget,
      stopCount: countByTrip.get(t.id) ?? 0,
      coverPhoto: coverByTrip.get(t.id) ?? null,
    };
  });
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
