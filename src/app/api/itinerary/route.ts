import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { generateItinerary } from "@/lib/itinerary/generate";
import type { PlannerInput } from "@/lib/types";
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
    timeStart: body.timeStart,
    timeEnd: body.timeEnd,
    budget: body.budget,
    travelStyle: body.travelStyle,
    transport: body.transport,
    interests: body.interests ?? [],
  };

  try {
    const { itinerary, plan } = await generateItinerary(input, {
      refinement: body.refinement,
      previous: body.previous,
    });
    return NextResponse.json({ itinerary, plan });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate itinerary.";
    console.error("Itinerary generation failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
