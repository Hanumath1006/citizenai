import { createClient } from "@/lib/supabase/server";
import type { PlaceBookmarkRow } from "@/lib/supabase/database.types";

type Kind = "favorites" | "saved_places";

export async function getBookmarks(kind: Kind): Promise<PlaceBookmarkRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from(kind)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (data as PlaceBookmarkRow[]) ?? [];
}

/**
 * Google place ids the user has bookmarked, for rendering the heart and
 * bookmark controls in their true state.
 *
 * Returned as a Set because callers check membership once per stop while
 * rendering an itinerary, and a linear scan per stop would be needless work
 * on a seven-day trip.
 */
export async function getBookmarkedPlaceIds(kind: Kind): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from(kind)
    .select("place_id")
    .eq("user_id", user.id)
    .not("place_id", "is", null);

  return new Set(
    ((data as { place_id: string | null }[]) ?? [])
      .map((r) => r.place_id)
      .filter((id): id is string => Boolean(id))
  );
}

export async function countBookmarks(kind: Kind): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from(kind)
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return count ?? 0;
}
