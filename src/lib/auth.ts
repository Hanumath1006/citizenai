import { createClient } from "@/lib/supabase/server";
import type {
  ProfileRow,
  UserRole,
  AccountStatus,
} from "@/lib/supabase/database.types";

/** The signed-in user, or null. Resolves to null if Supabase is unconfigured. */
export async function getUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/** The signed-in user's profile row, or null. */
export async function getProfile(): Promise<ProfileRow | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return data as ProfileRow | null;
  } catch {
    return null;
  }
}

/** Role + account status for the signed-in user, resolved in one query. */
export interface AccountState {
  userId: string;
  email: string | null;
  role: UserRole;
  status: AccountStatus;
}

/**
 * What the app shell needs on every authenticated page load: who you are,
 * whether you're an admin (to show the admin link), and whether your account
 * is still enabled.
 */
export async function getAccountState(): Promise<AccountState | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    return {
      userId: user.id,
      email: user.email ?? null,
      // A profile row can lag a brand-new signup by a moment; default to the
      // least-privileged, non-blocking interpretation rather than failing.
      role: (data?.role as UserRole) ?? "user",
      status: (data?.status as AccountStatus) ?? "active",
    };
  } catch {
    return null;
  }
}

/**
 * Record that the user is active, at most once every 15 minutes.
 *
 * The throttle lives in the WHERE clause so this stays a single round trip
 * with no read-before-write, and so concurrent requests can't both decide
 * they're the one that should write.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId)
      .or(`last_seen_at.is.null,last_seen_at.lt.${cutoff}`);
  } catch {
    // Presence tracking is never worth failing a page render over.
  }
}

/** Convenience: display name falling back to email local-part. */
export function displayName(
  profile: ProfileRow | null,
  email?: string | null
) {
  if (profile?.full_name) return profile.full_name.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}
