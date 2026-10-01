/**
 * Provider dashboard helpers: load the logged-in provider + plan features.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db, t, eq } from "@/lib/db";
import { requireProvider } from "@/lib/auth";
import { providerFeatures } from "@/lib/plans";
import { getFreePlan } from "@/lib/queries";

export const getDashboard = cache(async () => {
  const user = await requireProvider();
  const id = user.providerId;
  const [row, locations, gallery, faqs] = await Promise.all([
    db.query.providers.findFirst({
      where: eq(t.providers.id, id),
      with: {
        plan: true,
        city: true,
        // Many-to-many join rows – only the linked ids are needed
        conditions: { columns: { conditionId: true } },
        specialties: { columns: { specialtyId: true } },
        insurances: { columns: { insuranceId: true } },
      },
    }),
    // Counts for the profile checklist
    db.$count(t.providerLocations, eq(t.providerLocations.providerId, id)),
    db.$count(t.galleryImages, eq(t.galleryImages.providerId, id)),
    db.$count(t.providerFaqs, eq(t.providerFaqs.providerId, id)),
  ]);
  if (!row) redirect("/register");
  // Same shape the dashboard pages use: conditions/specialties/insurances as [{ id }] + _count
  const provider = {
    ...row,
    conditions: row.conditions.map((x) => ({ id: x.conditionId })),
    specialties: row.specialties.map((x) => ({ id: x.specialtyId })),
    insurances: row.insurances.map((x) => ({ id: x.insuranceId })),
    _count: { locations, gallery, faqs },
  };
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
