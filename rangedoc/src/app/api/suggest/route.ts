/**
 * GET /api/suggest?kind=condition|location|provider&q=...
 * Autocomplete suggestions for the search boxes.
 *  - condition: pain types / conditions + treatments
 *  - location:  cities (by name, state or ZIP code)
 *  - provider:  provider names (used on "Claim your profile")
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, t, eq, and, or, like, asc, desc } from "@/lib/db";
import { providerName } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") ?? "condition";
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (kind === "location") {
    const isZip = /^\d{3,5}$/.test(q);
    const c = t.cities;
    const cities = await db.query.cities.findMany({
      where: and(
        eq(c.active, true),
        q
          ? isZip
            ? like(c.zipCodes, `%${q}%`)
            : or(like(c.name, `${q}%`), like(c.name, `%${q}%`), like(c.state, `${q}%`), eq(c.stateCode, q))
          : eq(c.featured, true),
      ),
      orderBy: [desc(c.featured), asc(c.sortOrder), asc(c.name)],
      limit: 8,
    });
    return NextResponse.json(
      cities.map((c) => ({
        type: "city",
        label: `${c.name}, ${c.stateCode}`,
        sub: isZip ? `ZIP ${q}` : c.state,
        slug: c.slug,
        lat: c.lat,
        lng: c.lng,
      })),
    );
  }

  if (kind === "provider") {
    if (q.length < 2) return NextResponse.json([]);
    const words = q.split(/\s+/);
    const p = t.providers;
    const providers = await db.query.providers.findMany({
      where: and(
        eq(p.status, "ACTIVE"),
        or(
          like(p.firstName, `%${q}%`),
          like(p.lastName, `%${q}%`),
          like(p.practiceName, `%${q}%`),
          // "Jane Smith" → first name has "Jane" and last name has "Smith"
          words.length > 1 ? and(like(p.firstName, `%${words[0]}%`), like(p.lastName, `%${words[words.length - 1]}%`)) : undefined,
        ),
      ),
      with: { city: true },
      limit: 8,
    });
    return NextResponse.json(providers.map((p) => ({ type: "provider", label: providerName(p), sub: p.city ? `${p.city.name}, ${p.city.stateCode}` : p.practiceName, slug: p.slug, id: p.id })));
  }

  // Conditions (pain types) + specialties/treatments
  const [conditions, specialties] = await Promise.all([
    db.query.conditions.findMany({
      where: and(eq(t.conditions.active, true), q ? or(like(t.conditions.name, `%${q}%`), like(t.conditions.keywords, `%${q}%`)) : undefined),
      orderBy: [asc(t.conditions.sortOrder)],
      limit: q ? 8 : 10,
    }),
    q ? db.query.specialties.findMany({ where: like(t.specialties.name, `%${q}%`), limit: 4 }) : Promise.resolve([]),
  ]);
  return NextResponse.json([
    ...conditions.map((c) => ({ type: "condition", label: c.name, sub: "Condition / pain area", slug: c.slug })),
    ...specialties.map((s) => ({ type: "specialty", label: s.name, sub: "Treatment", slug: s.slug })),
  ]);
}
