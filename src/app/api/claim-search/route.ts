/**
 * GET /api/claim-search?q=name&city=slug – provider lookup for the claim page.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, t, eq, and, or, like, inArray } from "@/lib/db";
import { PROVIDER_TYPE_LABEL, providerName } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const citySlug = request.nextUrl.searchParams.get("city");
  if (q.length < 2) return NextResponse.json([]);
  const words = q.replace(/,/g, " ").split(/\s+/).filter((w) => w.length > 1 && !/^(dr\.?|pt|dpt|dc)$/i.test(w));
  const city = citySlug ? await db.query.cities.findFirst({ where: eq(t.cities.slug, citySlug) }) : null;
  const p = t.providers;
  const providers = await db.query.providers.findMany({
    where: and(
      // In the city: main city or any location there (subquery on provider_locations)
      city
        ? or(
            eq(p.cityId, city.id),
            inArray(p.id, db.select({ id: t.providerLocations.providerId }).from(t.providerLocations).where(eq(t.providerLocations.cityId, city.id))),
          )
        : undefined,
      // Name match (LIKE is case-insensitive with MySQL's collation)
      or(
        like(p.practiceName, `%${q}%`),
        ...words.map((w) => or(like(p.firstName, `%${w}%`), like(p.lastName, `%${w}%`), like(p.practiceName, `%${w}%`))),
      ),
    ),
    with: { city: true },
    limit: 10,
  });
  return NextResponse.json(
    providers.map((p) => ({ id: p.id, slug: p.slug, name: providerName(p), city: p.city ? `${p.city.name}, ${p.city.stateCode}` : "", claimStatus: p.claimStatus, typeLabel: PROVIDER_TYPE_LABEL[p.providerType] })),
  );
}
