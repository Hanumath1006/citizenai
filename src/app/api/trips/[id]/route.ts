import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TripStatus } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

const STATUSES: TripStatus[] = ["upcoming", "completed"];

/**
 * Update a trip the current user owns. Currently only `status`, which is how
 * a traveller marks an outing done (and moves it out of Upcoming).
 *
 * The `.eq("user_id")` is belt-and-braces alongside RLS: the row-level policy
 * already scopes writes to the owner, but stating it here means the query is
 * correct on its own terms rather than relying on a policy defined elsewhere.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let status: string;
  try {
    ({ status } = (await request.json()) as { status: string });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!STATUSES.includes(status as TripStatus)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("trips")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, status")
    .single();

  if (error || !data) {
    console.error("Trip status update failed:", error);
    return NextResponse.json({ error: "Could not update." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: data.status });
}

/** Delete a trip the current user owns (stops cascade via FK). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { error } = await supabase
    .from("trips")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
