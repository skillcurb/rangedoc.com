"use client";
/**
 * One provider in the search results list (matches the design mock).
 * Clicking the card body selects it → its location shows on the map.
 */
import Link from "next/link";
import { BadgeCheck, Check, CheckCircle2, Globe, MapPin, ShieldCheck } from "lucide-react";
import type { SearchResultCard as Card } from "@/lib/search";
import { AppImage } from "@/components/ui/AppImage";
import { Stars } from "@/components/ui/Stars";
import { RevealPhoneButton } from "@/components/site/RevealPhoneButton";
import { formatMiles } from "@/lib/geo";
import { track } from "@/lib/client/track";
import { cn } from "@/lib/utils";

export function SearchResultCard({ p, selected, onSelect, position }: { p: Card; selected: boolean; onSelect: () => void; position: number }) {
  const profileHref = `/provider/${p.slug}`;
  const clickProfile = () => track("SEARCH_CLICK", { providerId: p.id, meta: { position } });

  return (
    <article
      onClick={onSelect}
      className={cn(
        "card card-hover @container animate-fade-in cursor-pointer p-4",
        selected && "ring-2 ring-brand-500",
        p.isPaid && "border-brand-200",
      )}
    >
      <div className="flex flex-col gap-4 @md:flex-row @md:flex-wrap @3xl:flex-nowrap">
        {/* Photo */}
        <Link href={profileHref} onClick={clickProfile} className="relative h-40 w-full shrink-0 overflow-hidden rounded-lg bg-navy-50 @md:h-32 @md:w-28">
          <AppImage src={p.photo} alt={`Photo of ${p.name}`} fill sizes="112px" className="object-cover" />
          {p.featuredBadge && <span className="absolute top-1.5 left-1.5 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-navy-900">FEATURED</span>}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">
              <Link href={profileHref} onClick={clickProfile} className="hover:text-brand-700">
                {p.name}
              </Link>
            </h3>
            {p.matchPercent != null && <span className="badge bg-brand-50 text-brand-700">{p.matchPercent}% match</span>}
          </div>
          <p className="text-sm text-navy-600">{p.typeLabel}</p>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-navy-800">
            {p.licenseVerified && (
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-4 fill-brand-600 text-white" /> License verified
              </span>
            )}
            {p.claimed && (
              <span className="flex items-center gap-1">
                <BadgeCheck className="size-4 fill-brand-600 text-white" /> Profile claimed
              </span>
            )}
          </div>

          {p.rating != null && (
            <div className="mt-1.5 flex items-center gap-1.5 text-sm">
              <Stars value={p.rating} size={15} />
              <span className="font-semibold text-navy-900">{p.rating.toFixed(1)}</span>
              {p.reviewCount > 0 && <span className="text-muted">({p.reviewCount} reviews)</span>}
            </div>
          )}

          {(p.distance != null || p.cityLabel) && (
            <p className="mt-1 flex items-center gap-1 text-sm text-navy-700">
              <MapPin className="size-4 text-navy-600" />
              {p.distance != null ? `${formatMiles(p.distance)} · ` : ""}
              {p.cityLabel}
            </p>
          )}

          {p.conditions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.conditions.map((c) => (
                <span key={c} className="chip bg-navy-50/60">
                  {c}
                </span>
              ))}
            </div>
          )}
          {p.insurances.length > 0 && (
            <p className="mt-2 text-xs text-muted">
              Accepts: <span className="text-navy-700">{p.insurances.join(" · ")}</span>
              {p.moreInsurances > 0 && <span className="text-navy-600"> +{p.moreInsurances} more</span>}
            </p>
          )}
        </div>

        {/* Why this matches you */}
        {p.whyMatches.length > 0 && (
          <div className="w-full shrink-0 self-start rounded-lg bg-brand-50/70 p-3 @3xl:w-56">
            <p className="mb-1.5 text-xs font-semibold text-navy-900">Why this matches you:</p>
            <ul className="space-y-1">
              {p.whyMatches.map((w) => (
                <li key={w} className="flex gap-1.5 text-xs text-navy-700">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand-600" /> {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
        {p.hasPhone ? <RevealPhoneButton providerId={p.id} className="px-2" from="/search" /> : <span />}
        {p.hasWebsite ? (
          <a href={`/go/${p.id}?from=/search`} target="_blank" rel="noopener" className="btn-light px-2">
            <Globe className="size-4" /> Website
          </a>
        ) : (
          <span />
        )}
        <Link href={profileHref} onClick={clickProfile} className="btn-primary px-2">
          View Profile
        </Link>
      </div>
      {!p.claimed && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          <CheckCircle2 className="size-3" /> Is this your practice?{" "}
          <Link href={`/register?provider=${p.id}`} className="link text-[11px]">
            Claim this profile
          </Link>
        </p>
      )}
    </article>
  );
}
