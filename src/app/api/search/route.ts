/**
 * GET /api/search?… – JSON search results for the infinite-scroll list.
 * Accepts the same query parameters as the /search page.
 * Also records a SEARCH event (page 1) and SEARCH_IMPRESSION events so
 * providers can see how often they appear in results.
 */
import { NextResponse, type NextRequest } from "next/server";
import { parseSearchParams, searchProviders } from "@/lib/search";
import { recordEvents, type TrackEvent } from "@/lib/analytics";

export async function GET(request: NextRequest) {
  const sp: Record<string, string | string[]> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    const prev = sp[key];
    sp[key] = prev ? ([] as string[]).concat(prev, value) : value;
  });
  const input = parseSearchParams(sp);
  const data = await searchProviders(input);

  // Analytics (never block the response on failure)
  const meta = { q: input.q ?? null, condition: input.condition?.[0] ?? null, city: data.center?.label ?? null, type: input.type };
  const events: TrackEvent[] = data.results.map((r) => ({ type: "SEARCH_IMPRESSION", providerId: r.id, path: "/search", meta }));
  if (input.page === 1) events.unshift({ type: "SEARCH", path: "/search", meta: { ...meta, total: data.total } });
  recordEvents(events, {
    visitorId: request.cookies.get("rd_vid")?.value,
    userAgent: request.headers.get("user-agent"),
    headers: request.headers,
    geo: data.center ? { city: data.center.label, lat: data.center.lat, lng: data.center.lng } : null,
  }).catch((e) => console.error("[search:track]", e));

  return NextResponse.json(data);
}
