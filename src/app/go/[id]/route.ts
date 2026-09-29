/**
 * GET /go/{providerId} – "Visit website" link.
 * Records a WEBSITE_CLICK and redirects to the provider's website with
 * our source/UTM parameters, so the provider can see visits from us.
 */
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordEvents } from "@/lib/analytics";
import { getSettings } from "@/lib/settings";
import { slugify } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = await prisma.provider.findUnique({ where: { id: Number(id) }, select: { id: true, website: true } });
  if (!provider?.website) return NextResponse.redirect(new URL("/search", request.url));

  const settings = await getSettings();
  let target: URL;
  try {
    target = new URL(provider.website.startsWith("http") ? provider.website : `https://${provider.website}`);
  } catch {
    return NextResponse.redirect(new URL("/search", request.url));
  }
  target.searchParams.set("utm_source", slugify(settings.general.siteName) || "rangedoc");
  target.searchParams.set("utm_medium", "referral");
  target.searchParams.set("utm_campaign", "provider_profile");

  await recordEvents([{ type: "WEBSITE_CLICK", providerId: provider.id, path: request.nextUrl.searchParams.get("from") ?? "/go" }], {
    visitorId: request.cookies.get("rd_vid")?.value,
    userAgent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
    headers: request.headers,
  }).catch(() => undefined);

  return NextResponse.redirect(target.toString());
}
