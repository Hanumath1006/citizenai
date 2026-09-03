import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { generateItinerary } from "@/lib/itinerary/generate";
import { UsageRecorder } from "@/lib/usage/recorder";
import type { PlannerInput } from "@/lib/types";
import { MAX_TRIP_DAYS, requestedDayCount } from "@/lib/types";
import type { PlannedItinerary } from "@/lib/ai/planner";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body extends PlannerInput {
  refinement?: string;
  previous?: PlannedItinerary;
}

function validate(b: Partial<Body>): string | null {
  if (!b.city?.trim()) return "Please enter a city.";
  if (!b.date) return "Please pick a date.";
  if (!b.timeStart || !b.timeEnd) return "Please set a time window.";
  if (b.timeEnd <= b.timeStart) return "End time must be after start time.";

  // A missing endDate means a single-day outing, which stays valid.
  const endDate = b.endDate || b.date;
  if (endDate < b.date) return "The end date can't be before the start date.";
  if (requestedDayCount(b.date, endDate) > MAX_TRIP_DAYS) {
    return `Trips are limited to ${MAX_TRIP_DAYS} days for now — try a shorter range.`;
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const invalid = validate(body);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const input: PlannerInput = {
    city: body.city.trim(),
    date: body.date,
    endDate: body.endDate || body.date,
    timeStart: body.timeStart,
    timeEnd: body.timeEnd,
    budget: body.budget,
    travelStyle: body.travelStyle,
    transport: body.transport,
    interests: body.interests ?? [],
  };

  // Tracks every third-party call this request makes so the admin dashboard
  // can price it. Flushed once below, on both the success and failure paths —
  // a generation that failed halfway still cost real money.
  const rec = new UsageRecorder(user.id);

  try {
    const { itinerary, plan } = await generateItinerary(input, {
      refinement: body.refinement,
      previous: body.previous,
      rec,
    });

    const generationId = await rec.flush({
      input,
      stopCount: itinerary.days.reduce((n, d) => n + d.stops.length, 0),
      dayCount: itinerary.days.length,
      refined: Boolean(body.refinement),
      ok: true,
    });

    return NextResponse.json({ itinerary, plan, generationId });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate itinerary.";
    console.error("Itinerary generation failed:", err);

    await rec.flush({
      input,
      refined: Boolean(body.refinement),
      ok: false,
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
