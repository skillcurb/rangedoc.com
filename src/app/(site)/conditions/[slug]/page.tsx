/** CONDITION LANDING PAGE  ( /conditions/{slug} ) – great for SEO */
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
import { NearMeLink } from "@/components/site/NearMeLink";
import { TopProviders } from "@/components/site/TopProviders";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await prisma.condition.findUnique({ where: { slug: (await params).slug } });
  if (!c) return { title: "Condition not found" };
  return buildMetadata({ title: c.metaTitle || `${c.name} Treatment – Physical Therapists & Chiropractors`, description: c.metaDescription || c.description, keywords: c.metaKeywords || c.keywords, image: c.ogImage || c.image, path: `/conditions/${c.slug}` });
}

export default async function ConditionPage({ params }: Props) {
  const c = await prisma.condition.findUnique({ where: { slug: (await params).slug } });
  if (!c || !c.active) notFound();
  const cities = await prisma.city.findMany({ where: { active: true, featured: true }, orderBy: { sortOrder: "asc" }, take: 8 });
  return (
    <div className="container-x py-8">
      <Breadcrumbs items={[{ label: "Conditions", href: "/conditions" }, { label: c.name }]} />
      <div className="mt-6 grid items-center gap-8 md:grid-cols-[1fr_220px]">
        <div>
          <h1 className="text-4xl font-extrabold">{c.name}</h1>
          {c.description && <p className="mt-3 max-w-2xl text-lg text-navy-700">{c.description}</p>}
          <NearMeLink params={{ condition: c.slug }} className="btn-primary mt-6">
            Find {c.name.toLowerCase()} specialists near me <ArrowRight className="size-4" />
          </NearMeLink>
        </div>
        <div className="relative hidden aspect-[2/3] md:block">
          <AppImage src={c.image} alt={`${c.name} pain area`} fill sizes="220px" className="object-contain" />
        </div>
      </div>
      <h2 className="mt-12 mb-4 text-2xl font-bold">Top providers for {c.name.toLowerCase()}</h2>
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-3"><ProviderCardSkeleton /><ProviderCardSkeleton /><ProviderCardSkeleton /></div>}>
        <TopProviders input={{ condition: [c.slug], distance: 0 }} />
      </Suspense>
      <h2 className="mt-12 mb-4 text-xl font-bold">{c.name} care by city</h2>
      <div className="flex flex-wrap gap-2">
        {cities.map((city) => (
          <Link key={city.id} href={`/search?condition=${c.slug}&city=${city.slug}`} className="chip py-1.5 hover:border-brand-400">
            {c.name} in {city.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
