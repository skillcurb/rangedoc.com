/**
 * GET /api/geo/nearest?lat=..&lng=..
 * Returns the closest city in our directory, used to label the visitor's
 * detected GPS location ("Austin, TX").
 */
import { NextResponse, type NextRequest } from "next/server";
import { findNearestCity } from "@/lib/search";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  const city = await findNearestCity(lat, lng);
  // Only use the city name when it is reasonably close (60 miles)
  if (city && city.distance <= 60) return NextResponse.json({ label: `${city.name}, ${city.stateCode}`, citySlug: city.slug });
  return NextResponse.json({ label: "Current location", citySlug: city?.slug ?? null });
}
