/**
 * HOME PAGE  ( / )
 * ------------------------------------------------------------------
 * Hero with the provider search, then admin-managed sections that stream
 * in with skeletons via <Suspense>.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { AppImage } from "@/components/ui/AppImage";
import { Skeleton, ProviderCardSkeleton, TileGridSkeleton } from "@/components/ui/Skeleton";
import { HeroSearch } from "@/components/site/HeroSearch";
import { ScriptNote } from "@/components/site/Decor";
import { Leaf } from "lucide-react";
import {
  ClaimCta, FeaturedProviders, FindCareNearYou, HelpfulResources, HeroBadges, PopularWays, StatsStrip, WhereDoesItHurt,
} from "@/components/home/HomeSections";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return pageMetadata("home", { title: `${s.general.siteName} – ${s.home.heroTitle}`, description: s.home.heroSubtitle });
}

export default async function HomePage() {
  const s = await getSettings();
  const h = s.home;
  // WebSite structured data enables the Google sitelinks search box
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: s.general.siteName,
    url: process.env.NEXT_PUBLIC_SITE_URL,
    potentialAction: { "@type": "SearchAction", target: `${process.env.NEXT_PUBLIC_SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden bg-navy-50">
        <AppImage src={h.heroImage} alt={h.heroImageAlt} fill priority sizes="100vw" className="object-cover object-right" />
        {/* Soft white fade so text stays readable over the photo */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/0 md:via-white/70" />
        {/* Soft animated colour blobs */}
        <div className="blob top-[-120px] left-[-80px] size-[380px] bg-brand-200" aria-hidden />
        <div className="blob bottom-[-160px] left-[30%] size-[420px] bg-navy-200 [animation-delay:-6s]" aria-hidden />
        <div className="relative container-x pt-10 pb-10 md:pt-14 md:pb-14">
          <ScriptNote text={h.heroScript} className="absolute top-10 right-8 hidden lg:block" />
          <div className="max-w-2xl">
            <p className="eyebrow animate-fade-up">{h.heroEyebrow}</p>
            <h1 className="animate-fade-up mt-3 text-4xl leading-[1.05] font-extrabold [animation-delay:80ms] sm:text-5xl lg:text-[56px]">{h.heroTitle}</h1>
            <p className="animate-fade-up mt-4 max-w-xl text-lg text-navy-800 [animation-delay:160ms]">{h.heroSubtitle}</p>
          </div>
          <div className="animate-fade-up mt-7 max-w-4xl [animation-delay:240ms]">
            <HeroSearch />
            <Suspense fallback={<Skeleton className="mt-4 h-6 w-2/3" />}>
              <HeroBadges />
            </Suspense>
          </div>
          {h.heroCardText && (
            <div className="animate-float absolute right-8 bottom-10 hidden items-center gap-3 rounded-xl bg-white/90 px-4 py-3 text-sm text-navy-800 shadow-lift backdrop-blur xl:flex">
              <Leaf className="size-6 text-brand-600" />
              <span className="max-w-40">{h.heroCardText}</span>
            </div>
          )}
        </div>
      </section>

      <Suspense fallback={<Skeleton className="h-24 rounded-none" />}>
        <StatsStrip />
      </Suspense>

      <Suspense fallback={<div className="container-x py-12"><TileGridSkeleton /></div>}>
        <WhereDoesItHurt />
      </Suspense>

      <Suspense fallback={<div className="container-x py-12"><TileGridSkeleton count={8} className="lg:grid-cols-4" tileClassName="h-12" /></div>}>
        <PopularWays />
      </Suspense>

      <Suspense fallback={<div className="container-x py-12"><TileGridSkeleton count={6} className="lg:grid-cols-6" /></div>}>
        <FindCareNearYou />
      </Suspense>

      <Suspense fallback={<div className="container-x grid gap-4 py-8 md:grid-cols-3"><ProviderCardSkeleton /><ProviderCardSkeleton /><ProviderCardSkeleton /></div>}>
        <FeaturedProviders />
      </Suspense>

      <Suspense fallback={<div className="container-x py-8"><TileGridSkeleton count={3} className="lg:grid-cols-3" tileClassName="h-28" /></div>}>
        <HelpfulResources />
      </Suspense>

      <Suspense fallback={null}>
        <ClaimCta />
      </Suspense>
    </>
  );
}
