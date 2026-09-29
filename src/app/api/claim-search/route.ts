/**
 * GET /api/claim-search?q=name&city=slug – provider lookup for the claim page.
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROVIDER_TYPE_LABEL, providerName } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const citySlug = request.nextUrl.searchParams.get("city");
  if (q.length < 2) return NextResponse.json([]);
  const words = q.replace(/,/g, " ").split(/\s+/).filter((w) => w.length > 1 && !/^(dr\.?|pt|dpt|dc)$/i.test(w));
  const city = citySlug ? await prisma.city.findUnique({ where: { slug: citySlug } }) : null;
  const providers = await prisma.provider.findMany({
    where: {
      ...(city ? { OR: [{ cityId: city.id }, { locations: { some: { cityId: city.id } } }] } : {}),
      AND: [
        {
          OR: [
            { practiceName: { contains: q, mode: "insensitive" as const } },
            ...words.map((w) => ({ OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }, { practiceName: { contains: w, mode: "insensitive" as const } }] })),
          ],
        },
      ],
    },
    include: { city: true },
    take: 10,
  });
  return NextResponse.json(
    providers.map((p) => ({ id: p.id, slug: p.slug, name: providerName(p), city: p.city ? `${p.city.name}, ${p.city.stateCode}` : "", claimStatus: p.claimStatus, typeLabel: PROVIDER_TYPE_LABEL[p.providerType] })),
  );
}
