import { NextResponse } from "next/server";
import { fetchPhotoBytes } from "@/lib/google/places";
import { recordStandaloneCall } from "@/lib/usage/recorder";
import { PRICING } from "@/lib/usage/pricing";

/** Proxies Google Places photos so the API key stays server-side. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const width = Number(searchParams.get("w") ?? "1200");

  if (!name) {
    return NextResponse.json({ error: "missing name" }, { status: 400 });
  }

  // Photos are fetched lazily by the browser, long after the itinerary was
  // generated, so they are recorded as standalone events rather than being
  // attributed to a generation.
  const startedAt = Date.now();
  const photo = await fetchPhotoBytes(name, Number.isFinite(width) ? width : 1200);

  await recordStandaloneCall({
    provider: "places",
    operation: "photo",
    unitPrice: PRICING.placesPhoto,
    latencyMs: Date.now() - startedAt,
    ok: Boolean(photo.body),
    statusCode: photo.statusCode ?? undefined,
  });

  if (!photo.body) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(photo.body, {
    status: 200,
    headers: {
      "Content-Type": photo.contentType,
      // s-maxage + stale-while-revalidate let Vercel's CDN serve repeat and
      // shared views straight from the edge instead of re-hitting Google.
      "Cache-Control":
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800, immutable",
    },
  });
}
