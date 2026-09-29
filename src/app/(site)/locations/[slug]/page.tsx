/** CITY LANDING PAGE  ( /locations/{slug} ) */
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { AppImage } from "@/components/ui/AppImage";
import { Breadcrumbs } from "@/components/ui/Misc";
import { ProviderCardSkeleton } from "@/components/ui/Skeleton";
import { TopProviders } from "@/components/site/TopProviders";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await prisma.city.findUnique({ where: { slug: (await params).slug } });
  if (!c) return { title: "City not found" };
  return buildMetadata({ title: c.metaTitle || `Physical Therapists & Chiropractors in ${c.name}, ${c.stateCode}`, description: c.metaDescription || c.description, keywords: c.metaKeywords, image: c.ogImage || c.image, path: `/locations/${c.slug}` });
}

export default async function CityPage({ params }: Props) {
  const c = await prisma.city.findUnique({ where: { slug: (await params).slug } });
  if (!c || !c.active) notFound();
  const conditions = await prisma.condition.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, take: 12 });
  return (
    <div>
      <section className="relative h-56 overflow-hidden sm:h-72">
        <AppImage src={c.image} alt={`${c.name}, ${c.stateCode} skyline`} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 to-navy-950/10" />
        <div className="absolute inset-x-0 bottom-0 container-x pb-6 text-white">
          <h1 className="text-3xl font-extrabold text-white sm:text-5xl">
            Care in {c.name}, {c.stateCode}
          </h1>
          <p className="mt-1 max-w-2xl text-navy-100">{c.description}</p>
        </div>
      </section>
      <div className="container-x py-8">
        <Breadcrumbs items={[{ label: "Locations", href: "/locations" }, { label: `${c.name}, ${c.stateCode}` }]} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/search?city=${c.slug}`} className="btn-primary">
            All providers in {c.name} <ArrowRight className="size-4" />
          </Link>
          <Link href={`/search?city=${c.slug}&type=pt`} className="btn-light">
            Physical Therapists
          </Link>
          <Link href={`/search?city=${c.slug}&type=chiro`} className="btn-light">
            Chiropractors
          </Link>
        </div>
        <h2 className="mt-10 mb-4 text-2xl font-bold">Top providers in {c.name}</h2>
        <Suspense fallback={<div className="grid gap-4 md:grid-cols-3"><ProviderCardSkeleton /><ProviderCardSkeleton /><ProviderCardSkeleton /></div>}>
          <TopProviders input={{ city: c.slug }} />
        </Suspense>
        <h2 className="mt-12 mb-4 text-xl font-bold">Popular searches in {c.name}</h2>
        <div className="flex flex-wrap gap-2">
          {conditions.map((cond) => (
            <Link key={cond.id} href={`/search?city=${c.slug}&condition=${cond.slug}`} className="chip py-1.5 hover:border-brand-400">
              {cond.name} in {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
