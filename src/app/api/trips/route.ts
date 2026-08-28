import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UsageRecorder } from "@/lib/usage/recorder";
import type { Itinerary } from "@/lib/types";

export const runtime = "nodejs";

/** Save a generated itinerary as a trip (+ its stops) for the current user. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let itinerary: Itinerary;
  let generationId: string | null = null;
  try {
    ({ itinerary, generationId = null } = (await request.json()) as {
      itinerary: Itinerary;
      generationId?: string | null;
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!itinerary?.stops?.length) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  const { input } = itinerary;
  const isPast = new Date(input.date) < new Date(new Date().toDateString());

  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .insert({
      user_id: user.id,
      title: itinerary.title,
      summary: itinerary.summary,
      city: input.city,
      trip_date: input.date,
      time_start: input.timeStart,
      time_end: input.timeEnd,
      budget: input.budget,
      travel_style: input.travelStyle,
      transport: input.transport,
      interests: input.interests,
      est_cost_low: itinerary.estCostLow,
      est_cost_high: itinerary.estCostHigh,
      weather: itinerary.weather,
      status: isPast ? "completed" : "upcoming",
    })
    .select("id")
    .single();

  if (tripErr || !trip) {
    console.error("Trip insert failed:", tripErr);
    return NextResponse.json({ error: "Could not save trip." }, { status: 500 });
  }

  const stops = itinerary.stops.map((s) => ({
    trip_id: trip.id,
    ord: s.order,
    name: s.name,
    category: s.category,
    description: s.description,
    arrive_time: s.arriveTime,
    duration_min: s.durationMin,
    cost_low: s.costLow,
    cost_high: s.costHigh,
    is_indoor: s.isIndoor,
    travel_to_next_min: s.travelToNextMin,
    travel_mode: s.travelMode,
    place_id: s.placeId,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    rating: s.rating,
    photo_url: s.photoUrl,
    maps_url: s.mapsUrl,
  }));

  const { error: stopsErr } = await supabase.from("stops").insert(stops);
  if (stopsErr) {
    console.error("Stops insert failed:", stopsErr);
    // Roll back the orphaned trip.
    await supabase.from("trips").delete().eq("id", trip.id);
    return NextResponse.json({ error: "Could not save stops." }, { status: 500 });
  }

  if (generationId) {
    await UsageRecorder.attachTrip(generationId, trip.id, user.id);
  }

  return NextResponse.json({ id: trip.id });
}
