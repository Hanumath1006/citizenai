import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Update the current user's profile defaults. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: body.full_name ?? null,
      home_city: body.home_city ?? null,
      default_budget: body.default_budget ?? null,
      default_style: body.default_style ?? null,
      default_transport: body.default_transport ?? null,
      default_interests: body.default_interests ?? [],
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Profile update failed:", error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
