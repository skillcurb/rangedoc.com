/**
 * GET /api/providers/{id}/contact – reveals a provider's phone number.
 * The number is hidden on the page until the visitor clicks "Call";
 * this records a CALL_CLICK for the provider's analytics.
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordEvents } from "@/lib/analytics";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locationId = Number(request.nextUrl.searchParams.get("location")) || undefined;
  const provider = await prisma.provider.findUnique({
    where: { id: Number(id) },
    select: { id: true, phone: true, locations: { where: locationId ? { id: locationId } : { isPrimary: true }, select: { phone: true }, take: 1 } },
  });
  if (!provider) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const phone = provider.locations[0]?.phone || provider.phone;
  if (!phone) return NextResponse.json({ error: "No phone number" }, { status: 404 });

  await recordEvents([{ type: "CALL_CLICK", providerId: provider.id, path: request.nextUrl.searchParams.get("from") ?? null }], {
    visitorId: request.cookies.get("rd_vid")?.value,
    userAgent: request.headers.get("user-agent"),
    headers: request.headers,
  }).catch(() => undefined);

  return NextResponse.json({ phone });
}
