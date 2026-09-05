import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TABLES = { favorites: "favorites", saved: "saved_places" } as const;
type Kind = keyof typeof TABLES;

interface AddBody {
  kind: Kind;
  place: {
    placeId?: string | null;
    name: string;
    category?: string | null;
    city?: string | null;
    photoUrl?: string | null;
    address?: string | null;
    mapsUrl?: string | null;
  };
}

/**
 * The place ids already bookmarked, so the itinerary can render its hearts
 * in the right state. Without this the controls always start empty and a
 * place you favourited yesterday looks un-favourited today.
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
  const kind = searchParams.get("kind") as Kind | null;
  const table = kind ? TABLES[kind] : null;
  if (!table) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(table)
    .select("place_id")
    .eq("user_id", user.id)
    .not("place_id", "is", null);

  if (error) {
    console.error("Bookmark read failed:", error);
    return NextResponse.json({ error: "Could not load." }, { status: 500 });
  }

  return NextResponse.json({
    placeIds: (data ?? []).map((r) => r.place_id).filter(Boolean),
  });
}

/** Add a favorite or saved place. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: AddBody;
  try {
    body = (await request.json()) as AddBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const table = TABLES[body.kind];
  if (!table || !body.place?.name) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabase.from(table).upsert(
    {
      user_id: user.id,
      place_id: body.place.placeId ?? null,
      name: body.place.name,
      category: body.place.category ?? null,
      city: body.place.city ?? null,
      photo_url: body.place.photoUrl ?? null,
      address: body.place.address ?? null,
      maps_url: body.place.mapsUrl ?? null,
    },
    { onConflict: "user_id,place_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("Bookmark add failed:", error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/**
 * Remove a favorite or saved place, by row id or by place id.
 *
 * The row id is what the Favorites and Saved Places lists know; an
 * itinerary only knows the Google place id, which is what makes the heart
 * on a stop a real toggle rather than an add-only button.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as Kind | null;
  const id = searchParams.get("id");
  const placeId = searchParams.get("placeId");
  const table = kind ? TABLES[kind] : null;
  if (!table || (!id && !placeId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const query = supabase.from(table).delete().eq("user_id", user.id);
  const { error } = await (id
    ? query.eq("id", id)
    : query.eq("place_id", placeId!));

  if (error) {
    console.error("Bookmark remove failed:", error);
    return NextResponse.json({ error: "Could not remove." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
