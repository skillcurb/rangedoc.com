/**
 * Provider dashboard helpers: load the logged-in provider + plan features.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/lib/auth";
import { providerFeatures } from "@/lib/plans";
import { getFreePlan } from "@/lib/queries";

export const getDashboard = cache(async () => {
  const user = await requireProvider();
  const provider = await prisma.provider.findUnique({
    where: { id: user.providerId },
    include: { plan: true, city: true, conditions: { select: { id: true } }, specialties: { select: { id: true } }, insurances: { select: { id: true } }, _count: { select: { locations: true, gallery: true, faqs: true } } },
  });
  if (!provider) redirect("/register");
  const features = providerFeatures(provider, await getFreePlan());
  return { user, provider, features };
});

/** 0–100 profile completeness + checklist for the overview page */
export function profileChecklist(p: Awaited<ReturnType<typeof getDashboard>>["provider"]) {
  const items = [
    { label: "Basic Information", done: !!(p.firstName && p.lastName && p.phone), href: "/dashboard/profile" },
    { label: "Add Your Bio", done: !!p.bio && p.bio.length > 80, href: "/dashboard/profile" },
    { label: "Profile Photo", done: !!p.photo, href: "/dashboard/profile" },
    { label: "Add Practice Locations", done: p._count.locations > 0, href: "/dashboard/locations" },
    { label: "Select Your Specialties & Conditions", done: p.conditions.length > 0 && p.specialties.length > 0, href: "/dashboard/profile#services" },
    { label: "Add Insurance Information", done: p.insurances.length > 0, href: "/dashboard/profile#services" },
    { label: "Upload Photos & Video", done: p._count.gallery > 0, href: "/dashboard/media" },
    { label: "Set Your Availability", done: !!p.officeHours, href: "/dashboard/availability" },
    { label: "Add FAQs", done: p._count.faqs > 0, href: "/dashboard/faqs" },
  ];
  const percent = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  return { items, percent };
}
