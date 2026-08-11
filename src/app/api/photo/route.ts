import { NextResponse } from "next/server";
import { fetchPhotoBytes } from "@/lib/google/places";

/** Proxies Google Places photos so the API key stays server-side. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const width = Number(searchParams.get("w") ?? "1200");

  if (!name) {
    return NextResponse.json({ error: "missing name" }, { status: 400 });
  }

  const photo = await fetchPhotoBytes(name, Number.isFinite(width) ? width : 1200);
  if (!photo) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(photo.body, {
    status: 200,
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
