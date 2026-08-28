import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAdminContext } from "@/lib/admin/auth";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";

/**
 * Privileged user management. Both handlers re-verify admin status from the
 * caller's cookie session — the /admin layout guard protects pages, not
 * route handlers, and these are directly reachable over HTTP.
 */

/** Admin accounts are off-limits, so the console cannot lock itself out. */
async function loadTarget(id: string) {
  const db = createServiceClient();
  const { data: profile } = await db
    .from("profiles")
    .select("id, role, status, full_name")
    .eq("id", id)
    .single();

  if (!profile) return { db, profile: null, email: null };

  const { data: authUser } = await db.auth.admin.getUserById(id);
  return { db, profile, email: authUser?.user?.email ?? null };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  let action: string;
  let reason: string | undefined;
  try {
    ({ action, reason } = (await request.json()) as {
      action: string;
      reason?: string;
    });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (action !== "disable" && action !== "enable") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { db, profile, email } = await loadTarget(id);
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (profile.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot be disabled from the console." },
      { status: 400 }
    );
  }

  const disabling = action === "disable";

  // Ban at the auth layer first. This is what actually stops them: it blocks
  // sign-in and refresh. The profile flag is for display and for the app
  // shell to act on an already-issued token before it expires.
  const { error: banError } = await db.auth.admin.updateUserById(id, {
    ban_duration: disabling ? "876000h" : "none",
  });
  if (banError) {
    console.error("[admin] ban update failed:", banError);
    return NextResponse.json(
      { error: "Could not update the account." },
      { status: 500 }
    );
  }

  const { error: profileError } = await db
    .from("profiles")
    .update({
      status: disabling ? "disabled" : "active",
      disabled_at: disabling ? new Date().toISOString() : null,
      disabled_reason: disabling ? (reason?.slice(0, 500) ?? null) : null,
    })
    .eq("id", id);

  if (profileError) {
    // Roll the ban back so the two stores cannot disagree.
    await db.auth.admin.updateUserById(id, {
      ban_duration: disabling ? "none" : "876000h",
    });
    console.error("[admin] profile status update failed:", profileError);
    return NextResponse.json(
      { error: "Could not update the account." },
      { status: 500 }
    );
  }

  await logAdminAction({
    admin,
    action: disabling ? "disable_user" : "enable_user",
    targetType: "user",
    targetId: id,
    details: `${disabling ? "Disabled" : "Re-enabled"} account: ${email ?? id}${
      disabling && reason ? ` — ${reason}` : ""
    }`,
  });

  return NextResponse.json({
    ok: true,
    status: disabling ? "disabled" : "active",
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminContext();
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  if (id === admin.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 400 }
    );
  }

  const { db, profile, email } = await loadTarget(id);
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (profile.role === "admin") {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted from the console." },
      { status: 400 }
    );
  }

  // Log before deleting: once the row is gone we can no longer resolve the
  // email, and an untraceable deletion is the one thing an audit log exists
  // to prevent.
  await logAdminAction({
    admin,
    action: "delete_user",
    targetType: "user",
    targetId: id,
    details: `Deleted account: ${email ?? id}`,
  });

  // Removing the auth user cascades to profiles, trips, stops, favorites and
  // saved_places via ON DELETE CASCADE. Generation and API-event rows keep
  // their history with user_id nulled, so cost reporting stays intact.
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) {
    console.error("[admin] user delete failed:", error);
    return NextResponse.json(
      { error: "Could not delete the account." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
