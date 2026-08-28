import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Admin access control.
 *
 * The rule everything here enforces: authorization is decided from the
 * caller's *cookie session*, never from anything the browser sends. Only
 * after that check passes does any code reach for the service-role client,
 * which bypasses RLS and can read every user's data.
 */

export interface AdminContext {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/** The signed-in user if they are an admin, otherwise null. */
export async function getAdminContext(): Promise<AdminContext | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Read through the caller's own session: RLS restricts this to their row,
    // so a non-admin cannot probe anyone else's role.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") return null;

    return {
      userId: user.id,
      email: user.email ?? "",
      fullName: profile.full_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
    };
  } catch {
    return null;
  }
}

/** True when the signed-in user is an admin. Cheap enough for nav rendering. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminContext()) !== null;
}

/**
 * Guard for admin pages. Sends signed-out visitors to the login page and
 * signed-in non-admins to their own dashboard — deliberately not a 403, so
 * the existence of the admin area isn't advertised to ordinary users.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/dashboard" : "/login?next=/admin");
  }
  return ctx;
}

/**
 * Service-role client, handed out only after the caller proved they are an
 * admin. Every admin read/write goes through this: it bypasses RLS, which is
 * exactly what a cross-user dashboard needs and exactly why the check above
 * has to come first.
 */
export async function adminDb() {
  await requireAdmin();
  return createServiceClient();
}

/** Best-effort client IP, for the audit log. */
export async function callerIp(): Promise<string | null> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}
