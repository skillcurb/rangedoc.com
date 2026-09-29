/** BROWSE BY LOCATION  ( /locations ) – cities grouped by state */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";
import { AppImage } from "@/components/ui/AppImage";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("locations", { title: "Browse by Location", description: "Find physical therapists and chiropractors in cities across the United States." });
}

export default async function LocationsPage() {
  const cities = await prisma.city.findMany({ where: { active: true }, orderBy: [{ state: "asc" }, { name: "asc" }], include: { _count: { select: { providers: true } } } });
  const byState = cities.reduce<Record<string, typeof cities>>((acc, c) => ((acc[c.state] ??= []).push(c), acc), {});
  const featured = cities.filter((c) => c.featured);
  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-extrabold">Browse by Location</h1>
      <p className="mt-2 text-navy-700">Search by city to find licensed care close to home.</p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {featured.map((c) => (
          <Link key={c.id} href={`/locations/${c.slug}`} className="card group overflow-hidden">
            <div className="relative aspect-[16/9]">
              <AppImage src={c.image} alt={`${c.name} skyline`} fill sizes="240px" className="object-cover transition group-hover:scale-105" />
            </div>
            <p className="p-3 text-sm font-semibold">
              {c.name}, {c.stateCode}
            </p>
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(byState).map(([state, list]) => (
          <div key={state}>
            <h2 className="mb-2 text-base font-bold">{state}</h2>
            <ul className="space-y-1.5">
              {list.map((c) => (
                <li key={c.id}>
                  <Link href={`/locations/${c.slug}`} className="text-sm text-navy-700 hover:text-brand-700">
                    {c.name} <span className="text-muted">({c._count.providers})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
