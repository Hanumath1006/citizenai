import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getForecast } from "@/lib/weather";
import { recordStandaloneCall } from "@/lib/usage/recorder";
import type { CallRecorder } from "@/lib/usage/types";

export const runtime = "nodejs";

/** Longest plausible city name; anything beyond this is junk or an attack. */
const MAX_CITY = 80;

/**
 * Forecast for a city + date, so the planner can show the weather *before*
 * you spend a generation on a walking tour in the rain.
 *
 * Auth-gated on purpose: this is a thin proxy to OpenWeather on our key, and
 * leaving it open would let anyone drain the daily quota.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city")?.trim() ?? "";
  const date = searchParams.get("date") ?? "";

  if (!city || city.length > MAX_CITY || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // The peek is a standalone call rather than part of a generation, so each
  // event is written on its own instead of batched at the end of one. Costs
  // still land in the same api_events table, which keeps the admin usage
  // numbers honest about weather traffic the planner page generates.
  const recorder: CallRecorder = {
    recordFlat: (args) => {
      void recordStandaloneCall(args);
    },
    recordGemini: () => {},
  };

  const weather = await getForecast(city, date, recorder);
  return NextResponse.json({ weather });
}
