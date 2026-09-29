/**
 * CLAIM YOUR PROFILE  ( /claim-your-profile )
 * All text, steps, "why claim" items, plans and testimonials are
 * managed in the admin (Settings → Claim page, Content blocks, Plans,
 * Testimonials).
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronsRight, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";
import { AppImage } from "@/components/ui/AppImage";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";
import { Skeleton, TileGridSkeleton } from "@/components/ui/Skeleton";
import { MountainBand, ScriptNote } from "@/components/site/Decor";
import { ClaimSearch } from "@/components/claim/ClaimSearch";
import { PricingCards } from "@/components/claim/PricingCards";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return pageMetadata("claim", { title: s.claim.title, description: s.claim.subtitle });
}

async function Steps() {
  const steps = await prisma.contentBlock.findMany({ where: { section: "claim_steps", active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <ol className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white">{i + 1}</span>
          <div className="max-w-44">
            <p className="font-bold text-navy-900">{s.title}</p>
            <p className="text-sm text-navy-700">{s.text}</p>
          </div>
          {i < steps.length - 1 && <ChevronsRight className="mt-2 hidden size-5 text-navy-900 sm:block" />}
        </li>
      ))}
    </ol>
  );
}

async function WhyClaim() {
  const [s, items] = await Promise.all([getSettings(), prisma.contentBlock.findMany({ where: { section: "claim_why", active: true }, orderBy: { sortOrder: "asc" } })]);
  return (
    <section className="py-12">
      <div className="container-x">
        <h2 className="section-title">{s.claim.whyTitle}</h2>
        <p className="section-subtitle mb-6">{s.claim.whySubtitle}</p>
        <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((w) => (
            <div key={w.id} className="card card-hover p-5 text-center">
              <span className="icon-bubble mx-auto size-14"><Icon name={w.icon} className="size-7" /></span>
              <h3 className="mt-3 text-base font-bold">{w.title}</h3>
              <p className="mt-1 text-sm text-navy-700">{w.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

async function Testimonials() {
  const [s, items] = await Promise.all([getSettings(), prisma.testimonial.findMany({ where: { page: "claim", active: true }, orderBy: { sortOrder: "asc" } })]);
  if (!items.length) return null;
  return (
    <section className="bg-surface py-12">
      <div className="container-x">
        <h2 className="section-title">{s.claim.testimonialsTitle}</h2>
        <p className="section-subtitle mb-6">{s.claim.testimonialsSubtitle}</p>
        <div className="reveal grid gap-4 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.id} className="card card-hover flex gap-4 p-5">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-navy-50">
                <AppImage src={t.avatar} alt={t.name} fill sizes="80px" className="object-cover" />
              </div>
              <div>
                <blockquote className="text-sm text-navy-800">“{t.quote}”</blockquote>
                <figcaption className="mt-2 text-sm">
                  <b className="text-navy-900">{t.name}</b>
                  <span className="block text-xs text-muted">{[t.role, t.location].filter(Boolean).join(" • ")}</span>
                </figcaption>
                <Stars value={t.rating} size={14} className="mt-1" />
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

async function Pricing() {
  const [s, plans] = await Promise.all([getSettings(), prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })]);
  return (
    <section id="pricing" className="scroll-mt-20 py-12">
      <div className="container-x relative">
        <ScriptNote text="More visibility. More impact." className="absolute top-0 right-6 hidden text-xl xl:block" />
        <h2 className="section-title">{s.claim.pricingTitle}</h2>
        <p className="section-subtitle mb-8">{s.claim.pricingSubtitle}</p>
        <PricingCards
          plans={plans.map((p) => ({
            id: p.id, slug: p.slug, name: p.name, tagline: p.tagline, priceCents: p.priceCents, interval: p.interval, isFree: p.isFree,
            isPopular: p.isPopular, badge: p.badge, priceNote: p.priceNote, ctaLabel: p.ctaLabel, features: Array.isArray(p.features) ? (p.features as string[]) : [],
          }))}
        />
        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-navy-800">
          <Users className="size-6 text-brand-600" /> {s.claim.trustedLine}
        </p>
      </div>
    </section>
  );
}

export default async function ClaimPage() {
  const s = await getSettings();
  const c = s.claim;
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-50">
        <AppImage src={c.heroImage} alt="Provider smiling in a clinic" fill priority sizes="100vw" className="object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10" />
        <div className="blob top-[-100px] left-[-60px] size-[360px] bg-brand-200" aria-hidden />
        <div className="relative container-x pt-12 pb-28">
          <ScriptNote text={c.heroScript} className="absolute top-8 right-8 hidden lg:block" />
          <p className="eyebrow">{c.eyebrow}</p>
          <h1 className="animate-fade-up mt-3 text-4xl font-extrabold [animation-delay:80ms] sm:text-6xl">{c.title}</h1>
          <p className="mt-4 max-w-xl text-lg text-navy-800">{c.subtitle}</p>
          <Suspense fallback={<Skeleton className="mt-8 h-16 w-2/3" />}>
            <Steps />
          </Suspense>
          <div className="absolute right-8 bottom-24 hidden items-center gap-3 rounded-xl bg-white/90 px-4 py-3 text-sm text-navy-800 shadow-card lg:flex">
            <Users className="size-6 text-brand-600" /> {c.heroCard}
          </div>
        </div>
      </section>

      {/* Find your profile */}
      <section className="relative z-10 -mt-16">
        <div className="container-x grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="card animate-fade-up p-6 shadow-lift [animation-delay:200ms]">
            <h2 className="text-2xl font-bold">{c.findTitle}</h2>
            <p className="mb-4 text-navy-700">{c.findSubtitle}</p>
            <ClaimSearch />
            <p className="mt-4 text-center text-sm">
              <span className="text-navy-700">Can&apos;t find your profile?</span>{" "}
              <Link href="/register" className="link">
                Create a new provider listing →
              </Link>
            </p>
          </div>
          <div className="card flex flex-col gap-2 bg-brand-50/70 p-6">
            <ShieldCheck className="size-9 fill-brand-600 text-white" />
            <h3 className="font-bold">{c.secureTitle}</h3>
            <p className="text-sm text-navy-700">{c.secureText}</p>
            <Link href="/privacy-policy" className="link mt-auto text-sm">
              Learn more about our security →
            </Link>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="container-x py-12"><TileGridSkeleton count={5} className="lg:grid-cols-5" /></div>}>
        <WhyClaim />
      </Suspense>
      <Suspense fallback={<div className="container-x grid gap-4 py-12 md:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>}>
        <Pricing />
      </Suspense>
      <Suspense fallback={<div className="container-x py-12"><TileGridSkeleton count={3} className="lg:grid-cols-3" /></div>}>
        <Testimonials />
      </Suspense>

      <MountainBand>
        <div className="container-x relative py-16 text-center">
          <ScriptNote text="Healthier people. Stronger communities." className="absolute top-6 left-6 hidden text-xl lg:block" />
          <ScriptNote text="Together we move further." className="absolute top-6 right-6 hidden text-xl lg:block" />
          <h2 className="text-2xl font-bold">{c.ctaTitle}</h2>
          <p className="mt-1 text-navy-700">{c.ctaSubtitle}</p>
          <a href="#top" className="btn-primary mt-5">
            {c.ctaButton} <ArrowRight className="size-4" />
          </a>
        </div>
      </MountainBand>
    </>
  );
}
