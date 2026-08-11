import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/supabase/database.types";

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

/** Convenience: display name falling back to email local-part. */
export function displayName(
  profile: ProfileRow | null,
  email?: string | null
) {
  if (profile?.full_name) return profile.full_name.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}
