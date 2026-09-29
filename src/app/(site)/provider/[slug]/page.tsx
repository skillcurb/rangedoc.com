/**
 * PROVIDER PROFILE  ( /provider/{slug} )
 * ------------------------------------------------------------------
 * Server-rendered for SEO (meta tags, Open Graph, JSON-LD). Interactive
 * parts (appointment, email, call reveal, gallery, save/share, reviews)
 * are small client components. Sections that need extra queries stream
 * in via <Suspense>.
 *
 * Plan gating (see src/lib/plans.ts):
 *  - photos shown     → plan.maxPhotos
 *  - locations shown  → plan.maxLocations
 *  - FAQs / "view all"→ plan.maxFaqs / allowAllFaqs
 *  - reviews + rating → allowReviews / allowRatingDisplay
 *  - save + share     → allowShareSave
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Check, Clock, Globe, HelpCircle, MapPin, Settings2, ShieldCheck, Star, Stethoscope, Target, UserRoundCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { providerFeatures } from "@/lib/plans";
import { DAYS, formatTime, parseHours } from "@/lib/hours";
import { PROVIDER_TYPE_LABEL, formatDate, providerName, siteUrl, splitList, truncate } from "@/lib/utils";
import { getFreePlan } from "@/lib/queries";
import { AppImage } from "@/components/ui/AppImage";
import { Stars } from "@/components/ui/Stars";
import { Skeleton } from "@/components/ui/Skeleton";
import { MountainBand, ScriptNote } from "@/components/site/Decor";
import { TrackOnMount } from "@/components/site/Tracker";
import { RevealPhoneButton } from "@/components/site/RevealPhoneButton";
import { ProviderMapLazy } from "@/components/site/map";
import { AppointmentButton, EmailProviderButton } from "@/components/profile/ContactActions";
import { ClinicGallery } from "@/components/profile/ClinicGallery";
import { SaveButton, ShareButton } from "@/components/profile/SaveShare";
import { DirectionsLink, DistanceAway, ExpandableList, FaqList, ReviewForm } from "@/components/profile/ProfileWidgets";
import { SocialLinks, VideoEmbed } from "@/components/profile/ProviderMedia";

type Props = { params: Promise<{ slug: string }> };

/** Load everything the profile needs in one query */
async function getProvider(slug: string) {
  return prisma.provider.findUnique({
    where: { slug },
    include: {
      plan: true,
      city: true,
      conditions: { orderBy: { sortOrder: "asc" } },
      specialties: { orderBy: { sortOrder: "asc" } },
      insurances: { orderBy: { sortOrder: "asc" } },
      locations: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      gallery: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { sortOrder: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProvider(slug);
  if (!p) return { title: "Provider not found" };
  const name = providerName(p);
  const place = p.locations[0] ? `${p.locations[0].cityName}, ${p.locations[0].state}` : p.city ? `${p.city.name}, ${p.city.stateCode}` : "";
  return buildMetadata({
    title: p.metaTitle || `${name} – ${p.headline || PROVIDER_TYPE_LABEL[p.providerType]}${place ? ` in ${place}` : ""}`,
    description: p.metaDescription || truncate(p.bio || `${name} is a licensed ${PROVIDER_TYPE_LABEL[p.providerType].toLowerCase()}${place ? ` in ${place}` : ""}. Request an appointment online.`, 160),
    keywords: p.metaKeywords || [PROVIDER_TYPE_LABEL[p.providerType], ...p.conditions.map((c) => c.name), place].join(", "),
    image: p.ogImage || p.photo,
    path: `/provider/${p.slug}`,
    type: "profile",
  });
}

export default async function ProviderProfilePage({ params }: Props) {
  const { slug } = await params;
  const p = await getProvider(slug);
  if (!p || p.status !== "ACTIVE") notFound();

  const features = providerFeatures(p, await getFreePlan());
  const name = providerName(p);
  const typeLabel = p.headline || PROVIDER_TYPE_LABEL[p.providerType];
  const locations = p.locations.slice(0, features.maxLocations);
  const photos = p.gallery.slice(0, features.maxPhotos);
  const faqs = p.faqs.slice(0, features.allowAllFaqs ? undefined : features.maxFaqs);
  const videos = p.videos.slice(0, features.maxVideos);
  const social = features.allowSocialLinks ? p : {};
  const hours = parseHours(p.officeHours);
  const primary = locations[0];
  const cityLabel = primary ? `${primary.cityName}, ${primary.state}` : p.city ? `${p.city.name}, ${p.city.stateCode}` : "";
  const claimed = p.claimStatus === "CLAIMED";

  // Rating: provider-set rating (paid) or average of approved reviews
  const reviewAgg = features.allowReviews ? await prisma.review.aggregate({ where: { providerId: p.id, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }) : null;
  const rating = features.allowRatingDisplay && p.displayRating ? p.displayRating : reviewAgg?._avg.rating ?? null;
  const ratingCount = features.allowRatingDisplay && p.displayRating ? p.displayReviewCount ?? reviewAgg?._count._all ?? 0 : reviewAgg?._count._all ?? 0;

  const contactLocations = locations.map((l) => ({ id: l.id, name: l.name, address: `${l.address}, ${l.cityName}` }));
  const insuranceNames = p.insurances.map((i) => i.name);

  // Structured data for Google (medical business listing)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": p.providerType === "CHIROPRACTOR" ? "Chiropractor" : "Physiotherapy",
    name,
    image: p.photo ? (p.photo.startsWith("http") ? p.photo : siteUrl(p.photo)) : undefined,
    url: siteUrl(`/provider/${p.slug}`),
    telephone: undefined, // phone is revealed on click only
    medicalSpecialty: p.providerType === "CHIROPRACTOR" ? "Chiropractic" : "PhysicalTherapy",
    address: locations.map((l) => ({ "@type": "PostalAddress", streetAddress: l.address, addressLocality: l.cityName, addressRegion: l.state, postalCode: l.zip, addressCountry: "US" })),
    geo: primary ? { "@type": "GeoCoordinates", latitude: primary.lat, longitude: primary.lng } : undefined,
    aggregateRating: rating && ratingCount ? { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: ratingCount } : undefined,
  };

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "conditions", label: "Conditions" },
    { id: "treatments", label: "Treatments" },
    { id: "locations", label: "Locations" },
    ...(videos.length ? [{ id: "videos", label: "Videos" }] : []),
    ...(features.allowReviews || rating ? [{ id: "reviews", label: "Reviews" }] : []),
    ...(faqs.length ? [{ id: "faqs", label: "FAQs" }] : []),
  ];

  return (
    <div className="bg-surface/60">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackOnMount type="PROFILE_VIEW" providerId={p.id} />

      <div className="container-x py-5">
        {/* Breadcrumb + save/share */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <nav className="flex flex-wrap items-center gap-2 text-navy-700" aria-label="Breadcrumb">
            <Link href="/search" className="flex items-center gap-1 hover:text-brand-700">
              <ArrowLeft className="size-4" /> Back to Search
            </Link>
            <span className="text-muted">/</span>
            <Link href="/providers" className="hover:text-brand-700">
              Providers
            </Link>
            <span className="text-muted">/</span>
            <span className="text-navy-900">{[p.prefix, p.firstName, p.lastName].filter(Boolean).join(" ")}</span>
          </nav>
          {features.allowShareSave && (
            <div className="flex items-center gap-5">
              <SaveButton provider={{ id: p.id, slug: p.slug, name, photo: p.photo, typeLabel, city: cityLabel }} />
              <ShareButton providerId={p.id} title={`${name} – ${typeLabel}`} />
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* ───────── Header card ───────── */}
          <section className="card p-5">
            <div className="flex flex-col gap-6 sm:flex-row">
              <div className="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-xl bg-navy-50 sm:w-48">
                <AppImage src={p.photo} alt={`Photo of ${name}`} fill priority sizes="200px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-extrabold sm:text-4xl">{name}</h1>
                <p className="mt-1 text-lg text-navy-800">{typeLabel}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-navy-800">
                  {cityLabel && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" /> {cityLabel}
                    </span>
                  )}
                  <DistanceAway points={locations} />
                  {rating ? (
                    <span className="flex items-center gap-1.5">
                      <Stars value={rating} size={18} /> <b className="text-navy-900">{rating.toFixed(1)}</b>
                      {ratingCount ? <span className="text-muted">({ratingCount} reviews)</span> : null}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-6">
                  {p.licenseVerified && (
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="size-9 fill-brand-600 text-white" />
                      <div>
                        <p className="font-semibold text-navy-900">License Verified</p>
                        <p className="text-xs text-muted">Active, in good standing</p>
                      </div>
                    </div>
                  )}
                  {claimed && (
                    <div className="flex items-start gap-2">
                      <BadgeCheck className="size-9 fill-brand-600 text-white" />
                      <div>
                        <p className="font-semibold text-navy-900">Profile Claimed</p>
                        <p className="text-xs text-muted">Real provider, real information</p>
                      </div>
                    </div>
                  )}
                  {features.featuredBadge && (
                    <div className="flex items-start gap-2">
                      <Star className="size-9 fill-amber-400 text-amber-400" />
                      <div>
                        <p className="font-semibold text-navy-900">Featured Provider</p>
                        <p className="text-xs text-muted">Pro member</p>
                      </div>
                    </div>
                  )}
                </div>
                {features.allowSocialLinks && (
                  <div className="mt-4">
                    <SocialLinks links={social} name={name} />
                  </div>
                )}
                {p.quote && (
                  <blockquote className="mt-5 text-lg text-navy-700 italic">
                    “{p.quote}”<footer className="mt-1 text-base not-italic">— {[p.prefix, p.firstName, p.lastName].filter(Boolean).join(" ")}</footer>
                  </blockquote>
                )}
              </div>
            </div>

            {/* Best match */}
            {p.bestMatch && (
              <div className="mt-5 flex flex-col gap-4 rounded-xl bg-brand-50/70 p-4 md:flex-row">
                <Target className="size-10 shrink-0 text-brand-600" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold">Best Match For You</h2>
                  <p className="mt-1 text-sm text-navy-700">{p.bestMatch}</p>
                </div>
                {p.bestMatchPoints && (
                  <ul className="space-y-1.5 rounded-lg bg-white/70 p-3 text-xs md:w-64">
                    {p.bestMatchPoints.split("\n").map((x) => x.trim()).filter(Boolean).map((pt) => (
                      <li key={pt} className="flex gap-1.5 text-navy-800">
                        <Check className="size-3.5 shrink-0 text-brand-600" /> {pt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!claimed && (
              <p className="mt-4 rounded-lg border border-dashed border-line bg-surface px-4 py-3 text-sm text-navy-700">
                Are you {[p.prefix, p.firstName, p.lastName].filter(Boolean).join(" ")}?{" "}
                <Link href={`/register?provider=${p.id}`} className="link">
                  Claim this profile
                </Link>{" "}
                to update your information, add photos and receive appointment requests.
              </p>
            )}
          </section>

          {/* ───────── Get in touch ───────── */}
          <aside className="card h-fit p-5 lg:sticky lg:top-20">
            <h2 className="text-xl font-bold">Get in Touch</h2>
            <p className="mb-4 text-sm text-muted">Book an appointment or reach out directly.</p>
            <div className="space-y-2.5">
              <AppointmentButton providerId={p.id} providerName={name} locations={contactLocations} insurances={insuranceNames} className="w-full py-3" />
              {(p.phone || primary?.phone) && <RevealPhoneButton providerId={p.id} className="w-full border-navy-200 py-3 text-navy-900" />}
              <EmailProviderButton providerId={p.id} providerName={name} className="w-full border-navy-200 py-3 text-navy-900" />
              {p.website && (
                <a href={`/go/${p.id}?from=/provider/${p.slug}`} target="_blank" rel="noopener" className="btn-outline w-full border-navy-200 py-3 text-navy-900">
                  <Globe className="size-5" /> Visit Website
                </a>
              )}
            </div>
            {p.responseTime && (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted">
                <Clock className="size-4" /> {p.responseTime}
              </p>
            )}
            {p.acceptingNewPatients && <p className="mt-2 flex items-center gap-2 text-xs font-medium text-brand-700"><UserRoundCheck className="size-4" /> Accepting new patients</p>}
          </aside>
        </div>

        {/* ───────── Section tabs ───────── */}
        <nav className="no-scrollbar sticky top-16 z-20 -mx-4 mt-6 flex gap-6 overflow-x-auto border-b border-line bg-surface/95 px-4 backdrop-blur" aria-label="Profile sections">
          {TABS.map((t) => (
            <a key={t.id} href={`#${t.id}`} className="shrink-0 border-b-2 border-transparent py-3 text-sm font-medium text-navy-800 hover:border-brand-600 hover:text-brand-700">
              {t.label}
            </a>
          ))}
        </nav>

        {/* ───────── Overview ───────── */}
        <div id="overview" className="mt-6 grid scroll-mt-32 gap-6 lg:grid-cols-[1fr_1fr_300px]">
          <section className="card p-5">
            <h2 className="text-lg font-bold">About {[p.prefix, p.firstName, p.lastName].filter(Boolean).join(" ")}</h2>
            <div className="mt-3 text-sm leading-6 whitespace-pre-line text-navy-700">{p.bio || "This provider hasn't added a biography yet."}</div>
            {p.education && (
              <p className="mt-4 text-sm text-navy-800">
                <b>Education:</b> {p.education}
              </p>
            )}
            {p.yearsExperience ? (
              <p className="mt-1 text-sm text-navy-800">
                <b>Experience:</b> {p.yearsExperience}+ years
              </p>
            ) : null}
            {p.languages && (
              <p className="mt-1 text-sm text-navy-800">
                <b>Languages:</b> {p.languages}
              </p>
            )}
            {features.allowVideo && p.videoUrl && <VideoEmbed url={p.videoUrl} title={`${name} introduction video`} className="mt-4" />}
          </section>

          <section className="card p-5">
            <ClinicGallery providerId={p.id} photos={photos.map((g) => ({ id: g.id, url: g.url, alt: g.alt }))} />
          </section>

          <div className="space-y-6">
            <section className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <Clock className="size-5 text-brand-600" /> Office Hours
              </h2>
              <dl className="space-y-1.5 text-sm">
                {DAYS.map((d) => (
                  <div key={d.key} className="flex justify-between">
                    <dt className="text-navy-800">{d.label}</dt>
                    <dd className="text-navy-900">{hours[d.key].closed ? "Closed" : `${formatTime(hours[d.key].open)} – ${formatTime(hours[d.key].close)}`}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* ───────── Locations ───────── */}
            <section id="locations" className="card scroll-mt-32 p-5">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                <MapPin className="size-5 text-brand-600" /> {locations.length > 1 ? "Locations" : "Location"}
              </h2>
              <ul className="space-y-4">
                {locations.map((l) => (
                  <li key={l.id} className="flex justify-between gap-3">
                    <div className="text-sm">
                      <p className="font-semibold text-navy-900">{l.name}</p>
                      <p className="text-navy-700">{l.address}</p>
                      <p className="text-navy-700">
                        {l.cityName}, {l.state} {l.zip}
                      </p>
                      <DirectionsLink providerId={p.id} address={`${l.address}, ${l.cityName}, ${l.state} ${l.zip}`} />
                    </div>
                    <DistanceAway points={[l]} suffix="" className="shrink-0 text-xs text-muted" />
                  </li>
                ))}
              </ul>
              {locations.length > 0 && (
                <div className="mt-4 h-48 overflow-hidden rounded-lg">
                  <ProviderMapLazy markers={locations.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, title: l.name, subtitle: l.address }))} />
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ───────── Conditions / Treatments / Insurance ───────── */}
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <section id="conditions" className="card scroll-mt-32 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Stethoscope className="size-5 text-brand-600" /> Conditions Treated
            </h2>
            <ExpandableList items={p.conditions.map((c) => c.name)} moreLabel="View all conditions" />
          </section>
          <section id="treatments" className="card scroll-mt-32 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <Settings2 className="size-5 text-brand-600" /> Treatment Specialties
            </h2>
            <ExpandableList items={p.specialties.map((s) => s.name)} moreLabel="View all treatments" />
          </section>
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="size-5 text-brand-600" /> Insurance Accepted
            </h2>
            <ExpandableList items={insuranceNames} moreLabel="View all accepted insurance" />
          </section>
        </div>

        {/* ───────── Video gallery (paid plans) ───────── */}
        {videos.length > 0 && (
          <section id="videos" className="card mt-6 scroll-mt-32 p-5">
            <h2 className="mb-4 text-lg font-bold">Videos</h2>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {videos.map((v) => (
                <figure key={v.id}>
                  <VideoEmbed url={v.url} title={v.title} />
                  <figcaption className="mt-2 text-sm font-medium text-navy-900">{v.title}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ───────── Ratings & reviews ───────── */}
        {(features.allowReviews || rating) && (
          <section id="reviews" className="card mt-6 scroll-mt-32 p-5">
            <Suspense fallback={<Skeleton className="h-40" />}>
              <ReviewsSection providerId={p.id} rating={rating} ratingCount={ratingCount} source={p.ratingSource} endorsement={p.endorsement} allowReviews={features.allowReviews} />
            </Suspense>
          </section>
        )}

        {/* ───────── FAQs ───────── */}
        {faqs.length > 0 && (
          <section id="faqs" className="card mt-6 scroll-mt-32 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <HelpCircle className="size-5 fill-brand-600 text-white" /> Frequently Asked Questions
            </h2>
            <FaqList faqs={faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer }))} allowAll={features.allowAllFaqs} />
          </section>
        )}
      </div>

      {/* ───────── Bottom CTA ───────── */}
      <MountainBand className="mt-8">
        <div className="container-x relative py-14 text-center">
          <ScriptNote text="More patients. A healthier tomorrow." className="absolute top-6 left-8 hidden text-xl lg:block" />
          <ScriptNote text="Less pain. More living." className="absolute top-6 right-8 hidden text-xl lg:block" />
          <h2 className="text-2xl font-bold">Ready to move better?</h2>
          <p className="mt-1 text-navy-700">Find the right care. Feel better. Get back to what you love.</p>
          <div className="mt-4 flex justify-center">
            <AppointmentButton providerId={p.id} providerName={name} locations={contactLocations} insurances={insuranceNames} label="Request an Appointment" icon={false} className="px-6" />
          </div>
        </div>
      </MountainBand>
    </div>
  );
}

/** Ratings summary + approved reviews (streams in separately) */
async function ReviewsSection({ providerId, rating, ratingCount, source, endorsement, allowReviews }: { providerId: number; rating: number | null; ratingCount: number; source: string | null; endorsement: string | null; allowReviews: boolean }) {
  const reviews = allowReviews ? await prisma.review.findMany({ where: { providerId, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 10 }) : [];
  const highlight = reviews.find((r) => r.rating >= 4);
  return (
    <>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <Star className="size-5 fill-brand-600 text-brand-600" /> Ratings &amp; Professional Endorsements
      </h2>
      <div className="grid gap-5 md:grid-cols-3 md:divide-x md:divide-line">
        <div>
          {rating ? (
            <>
              <div className="flex items-center gap-2">
                <Stars value={rating} size={22} /> <b className="text-2xl text-navy-900">{rating.toFixed(1)}</b> <span className="text-muted">out of 5</span>
              </div>
              <p className="mt-1 text-sm text-navy-700">
                {ratingCount} {source ? `${source} ` : ""}reviews
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">No ratings yet — be the first to leave a review.</p>
          )}
        </div>
        <div className="md:px-5">
          {highlight ? (
            <blockquote className="text-sm text-navy-700 italic">
              “{truncate(highlight.body, 180)}”<footer className="mt-1 not-italic text-muted">— {highlight.authorName}</footer>
            </blockquote>
          ) : null}
        </div>
        {endorsement && (
          <div className="flex items-center gap-3 rounded-lg bg-surface p-3 md:ml-5">
            <Users className="size-8 shrink-0 text-brand-600" />
            <p className="text-sm text-navy-800">{endorsement}</p>
          </div>
        )}
      </div>

      {allowReviews && (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <article key={r.id} className="border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} size={14} />
                {r.title && <b className="text-sm text-navy-900">{r.title}</b>}
              </div>
              <p className="mt-1 text-sm text-navy-700">{r.body}</p>
              <p className="mt-1 text-xs text-muted">
                {r.authorName} · {formatDate(r.createdAt)}
              </p>
            </article>
          ))}
          <div className="border-t border-line pt-4">
            <ReviewForm providerId={providerId} />
          </div>
        </div>
      )}
    </>
  );
}
