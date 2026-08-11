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
