/**
 * Home page sections. Each one is an async Server Component that loads
 * its own data and is wrapped in <Suspense> with a skeleton on the page,
 * so the hero shows instantly and the rest streams in.
 * Everything here is managed from the admin dashboard.
 */
import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { AppImage } from "@/components/ui/AppImage";
import { Icon } from "@/components/ui/Icon";
import { Carousel } from "@/components/site/Carousel";
import { NearMeLink } from "@/components/site/NearMeLink";
import { ProviderCard } from "@/components/site/ProviderCard";
import { BlogCardRow } from "@/components/site/BlogCard";
import { PROVIDER_TYPE_LABEL, TYPE_ENUM_TO_PARAM, providerName } from "@/lib/utils";

/** Trust badges under the hero search ("Licensed professionals", …) – Admin → Content blocks: home_hero_badges */
export async function HeroBadges() {
  const items = await prisma.contentBlock.findMany({ where: { section: "home_hero_badges", active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      {items.map((b) => (
        <li key={b.id} className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <span className="icon-bubble size-7 rounded-lg"><Icon name={b.icon} className="size-4" /></span> {b.title}
        </li>
      ))}
    </ul>
  );
}

/** Stats strip under the hero – Admin → Content blocks: home_stats */
export async function StatsStrip() {
  const items = await prisma.contentBlock.findMany({ where: { section: "home_stats", active: true }, orderBy: { sortOrder: "asc" } });
  if (!items.length) return null;
  return (
    <section className="relative border-b border-line bg-white">
      <div className="reveal container-x grid grid-cols-2 divide-line py-5 md:grid-cols-4 md:divide-x">
        {items.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-2 py-2 md:justify-center">
            <span className="icon-bubble size-12 shrink-0"><Icon name={s.icon} className="size-6 stroke-[1.75]" /></span>
            <div>
              <p className="font-display text-lg leading-tight font-bold text-navy-900">{s.title}</p>
              {s.text && <p className="text-sm text-navy-600">{s.text}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** "Where does it hurt?" – conditions with showOnHome; carousel when more than fit */
export async function WhereDoesItHurt() {
  const [s, conditions] = await Promise.all([
    getSettings(),
    prisma.condition.findMany({ where: { active: true, showOnHome: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <section className="bg-gradient-to-b from-surface to-white py-12">
      <div className="reveal container-x">
        <h2 className="section-title">{s.home.whereHurtsTitle}</h2>
        <p className="section-subtitle mb-6">{s.home.whereHurtsSubtitle}</p>
        <Carousel>
          {conditions.map((c) => (
            <NearMeLink
              key={c.id}
              params={{ condition: c.slug }}
              className="card-hover group flex w-[46%] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card sm:w-[23%] lg:w-[calc((100%-84px)/8)]"
            >
              <div className="relative aspect-[5/4] bg-gradient-to-b from-navy-50 to-white">
                <AppImage src={c.image} alt={`${c.name} pain area`} fill sizes="(max-width:640px) 46vw, 150px" className="object-contain p-2 transition group-hover:scale-105" />
              </div>
              <span className="py-2.5 text-center text-sm font-semibold text-navy-900">{c.shortName || c.name}</span>
            </NearMeLink>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/** "Popular ways to find care" – Admin → Popular searches */
export async function PopularWays() {
  const [s, items] = await Promise.all([
    getSettings(),
    prisma.popularSearch.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { condition: true, specialty: true } }),
  ]);
  if (!items.length) return null;
  return (
    <section className="bg-gradient-to-b from-white to-surface py-12">
      <div className="reveal container-x">
        <h2 className="section-title">{s.home.popularTitle}</h2>
        <p className="section-subtitle mb-6">{s.home.popularSubtitle}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <NearMeLink
              key={item.id}
              params={{
                type: item.providerType ? TYPE_ENUM_TO_PARAM[item.providerType] : undefined,
                condition: item.condition?.slug,
                specialty: item.specialty?.slug,
                q: !item.condition && !item.specialty ? item.query ?? undefined : undefined,
              }}
              className="group flex items-center justify-between rounded-lg border border-line bg-white px-5 py-3 text-sm font-medium text-navy-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-md"
            >
              {item.label} <ArrowRight className="size-4" />
            </NearMeLink>
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Find care near you" – featured cities */
export async function FindCareNearYou() {
  const [s, cities] = await Promise.all([
    getSettings(),
    prisma.city.findMany({ where: { active: true, featured: true }, orderBy: { sortOrder: "asc" }, take: 5 }),
  ]);
  return (
    <section className="py-12">
      <div className="reveal container-x">
        <h2 className="section-title">{s.home.nearTitle}</h2>
        <p className="section-subtitle mb-6">{s.home.nearSubtitle}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cities.map((c) => (
            <Link key={c.id} href={`/search?city=${c.slug}`} className="card-hover group overflow-hidden rounded-xl border border-line bg-white shadow-card">
              <div className="relative aspect-[16/9] overflow-hidden">
                <AppImage src={c.image} alt={`${c.name}, ${c.stateCode} skyline`} fill sizes="(max-width:640px) 50vw, 200px" className="object-cover transition duration-300 group-hover:scale-105" />
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-navy-800">
                {c.name} <ArrowRight className="size-4" />
              </div>
            </Link>
          ))}
          <Link href="/locations" className="card-hover flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-gradient-to-br from-white to-navy-50 p-4 text-center font-semibold text-navy-800">
            <MapPin className="size-8 fill-navy-900 text-white" />
            <span className="flex items-center gap-1">
              Browse All Locations <ArrowRight className="size-4" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

/** Featured providers – providers with "featured" ticked in Admin → Providers */
export async function FeaturedProviders() {
  const [s, providers] = await Promise.all([
    getSettings(),
    prisma.provider.findMany({
      where: { featured: true, status: "ACTIVE" },
      orderBy: [{ featuredOrder: "asc" }, { id: "asc" }],
      take: 6,
      include: {
        city: true,
        conditions: { select: { name: true }, orderBy: { sortOrder: "asc" }, take: 3 },
        specialties: { select: { name: true }, take: 2 },
      },
    }),
  ]);
  if (!providers.length) return null;
  return (
    <section className="py-8">
      <div className="reveal container-x rounded-2xl bg-gradient-to-br from-surface via-white to-brand-50/60 p-4 ring-1 ring-line sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{s.home.featuredTitle}</h2>
          <Link href="/providers" className="link flex items-center gap-1 text-sm">
            View all providers <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <ProviderCard
              key={p.id}
              p={{
                slug: p.slug,
                name: providerName(p),
                typeLabel: p.headline || PROVIDER_TYPE_LABEL[p.providerType],
                photo: p.photo,
                licenseVerified: p.licenseVerified,
                conditions: p.conditions.map((c) => c.name),
                specialties: p.specialties.map((x) => x.name),
                city: p.city ? `${p.city.name}, ${p.city.stateCode}` : "",
                education: p.education,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Helpful resources – blog posts marked "featured" */
export async function HelpfulResources() {
  const [s, posts] = await Promise.all([
    getSettings(),
    prisma.blogPost.findMany({
      where: { published: true, featured: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { slug: true, title: true, excerpt: true, coverImage: true, coverAlt: true, publishedAt: true, readingMinutes: true },
    }),
  ]);
  if (!posts.length) return null;
  return (
    <section className="py-8">
      <div className="reveal container-x">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold sm:text-3xl">{s.home.resourcesTitle}</h2>
          <Link href="/blog" className="link flex items-center gap-1 text-sm">
            View all resources <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((p) => (
            <BlogCardRow key={p.slug} post={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** "Are you a PT or chiropractor?" call to action */
export async function ClaimCta() {
  const s = await getSettings();
  return (
    <section className="pt-4 pb-12">
      <div className="reveal container-x">
        <div className="animate-gradient flex flex-col items-start gap-4 rounded-2xl bg-gradient-to-r from-brand-50 via-white to-navy-50 bg-[length:200%_200%] p-6 shadow-card ring-1 ring-brand-100 sm:flex-row sm:items-center sm:p-8">
          <Users className="size-14 shrink-0 stroke-[1.4] text-brand-600" />
          <div className="flex-1">
            <h2 className="text-xl font-bold sm:text-2xl">{s.home.ctaTitle}</h2>
            <p className="mt-1 text-navy-700">{s.home.ctaText}</p>
          </div>
          <Link href="/claim-your-profile" className="btn-primary btn-lg">
            {s.home.ctaButton} <ArrowRight className="size-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
