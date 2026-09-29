/**
 * GET /api/suggest?kind=condition|location|provider&q=...
 * Autocomplete suggestions for the search boxes.
 *  - condition: pain types / conditions + treatments
 *  - location:  cities (by name, state or ZIP code)
 *  - provider:  provider names (used on "Claim your profile")
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { providerName } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") ?? "condition";
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();

  if (kind === "location") {
    const isZip = /^\d{3,5}$/.test(q);
    const cities = await prisma.city.findMany({
      where: {
        active: true,
        ...(q
          ? isZip
            ? { zipCodes: { contains: q } }
            : { OR: [{ name: { startsWith: q } }, { name: { contains: q } }, { state: { startsWith: q } }, { stateCode: q }] }
          : { featured: true }),
      },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: 8,
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
    const providers = await prisma.provider.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { practiceName: { contains: q } },
          ...(words.length > 1 ? [{ AND: [{ firstName: { contains: words[0] } }, { lastName: { contains: words[words.length - 1] } }] }] : []),
        ],
      },
      include: { city: true },
      take: 8,
    });
    return NextResponse.json(providers.map((p) => ({ type: "provider", label: providerName(p), sub: p.city ? `${p.city.name}, ${p.city.stateCode}` : p.practiceName, slug: p.slug, id: p.id })));
  }

  // Conditions (pain types) + specialties/treatments
  const [conditions, specialties] = await Promise.all([
    prisma.condition.findMany({
      where: { active: true, ...(q ? { OR: [{ name: { contains: q } }, { keywords: { contains: q } }] } : {}) },
      orderBy: { sortOrder: "asc" },
      take: q ? 8 : 10,
    }),
    q ? prisma.specialty.findMany({ where: { name: { contains: q } }, take: 4 }) : Promise.resolve([]),
  ]);
  return NextResponse.json([
    ...conditions.map((c) => ({ type: "condition", label: c.name, sub: "Condition / pain area", slug: c.slug })),
    ...specialties.map((s) => ({ type: "specialty", label: s.name, sub: "Treatment", slug: s.slug })),
  ]);
}
