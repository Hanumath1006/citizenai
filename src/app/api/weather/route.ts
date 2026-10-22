import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getForecastRange } from "@/lib/weather";
import { tripDates } from "@/lib/types";
import { recordStandaloneCall } from "@/lib/usage/recorder";
import type { CallRecorder } from "@/lib/usage/types";

export const runtime = "nodejs";

/** Longest plausible city name; anything beyond this is junk or an attack. */
const MAX_CITY = 80;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Forecast for a city + date (or date range), so the planner can show the weather *before*
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
  const endDate = searchParams.get("endDate") ?? date;

  if (
    !city ||
    city.length > MAX_CITY ||
    !ISO_DATE.test(date) ||
    !ISO_DATE.test(endDate) ||
    endDate < date
  ) {
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

  // A range is still one upstream request — getForecastRange slices every day
  // out of the same five-day response — so a week costs what a day does.
  const dates = tripDates(date, endDate);
  const byDate = await getForecastRange(city, dates, recorder);
  const days = dates.map((d) => ({ date: d, weather: byDate[d] }));
  return NextResponse.json({ weather: days[0].weather, days });
}
