/**
 * Provider card used in "Featured Providers" (home) and on city /
 * condition landing pages.
 */
import Link from "next/link";
import { ArrowRight, BadgeCheck, GraduationCap, MapPin, Stethoscope } from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";

export type ProviderCardData = {
  slug: string;
  name: string;
  typeLabel: string;
  photo: string | null;
  licenseVerified: boolean;
  conditions: string[];
  specialties: string[];
  city: string;
  education: string | null;
};

export function ProviderCard({ p }: { p: ProviderCardData }) {
  return (
    <article className="card card-hover group flex gap-4 p-4">
      <Link href={`/provider/${p.slug}`} className="relative h-40 w-32 shrink-0 overflow-hidden rounded-lg bg-navy-50">
        <AppImage src={p.photo} alt={`Photo of ${p.name}`} fill sizes="128px" className="object-cover transition duration-500 group-hover:scale-105" />
      </Link>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-bold">
          <Link href={`/provider/${p.slug}`} className="hover:text-brand-700">
            {p.name}
          </Link>
        </h3>
        <p className="text-sm text-muted">{p.typeLabel}</p>
        {p.licenseVerified && (
          <p className="mt-1 flex items-center gap-1 text-sm font-medium text-brand-700">
            <BadgeCheck className="size-4 fill-brand-600 text-white" /> License Verified
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.conditions.slice(0, 3).map((c) => (
            <span key={c} className="chip bg-surface">
              {c}
            </span>
          ))}
        </div>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {p.specialties.length > 0 && (
            <li className="flex items-center gap-1.5 truncate">
              <Stethoscope className="size-3.5 shrink-0 text-navy-600" /> {p.specialties.slice(0, 2).join(" · ")}
            </li>
          )}
          {p.city && (
            <li className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-navy-600" /> {p.city}
            </li>
          )}
          {p.education && (
            <li className="flex items-center gap-1.5 truncate">
              <GraduationCap className="size-3.5 shrink-0 text-navy-600" /> {p.education}
            </li>
          )}
        </ul>
        <Link href={`/provider/${p.slug}`} className="btn-outline btn-sm mt-3 w-full border-navy-600 text-navy-700 hover:bg-navy-50">
          View Profile <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}
