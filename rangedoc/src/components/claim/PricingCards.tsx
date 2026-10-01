/**
 * Pricing cards (claim page + dashboard billing).
 * Free plan → /register?plan=free ; paid plan → /checkout/plan/{slug}
 */
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { INTERVAL_LABEL } from "@/lib/plans";
import { cn, formatMoney } from "@/lib/utils";

export type PricingPlan = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  priceCents: number;
  interval: string;
  isFree: boolean;
  isPopular: boolean;
  badge: string | null;
  priceNote: string | null;
  ctaLabel: string | null;
  features: string[];
};

export function PricingCards({ plans, currentPlanId, hrefFor }: { plans: PricingPlan[]; currentPlanId?: number | null; hrefFor?: (p: PricingPlan) => string }) {
  return (
    <div className={cn("reveal mx-auto grid max-w-5xl gap-6", plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
      {plans.map((p) => {
        const href = hrefFor ? hrefFor(p) : p.isFree ? "/register?plan=free" : `/checkout/plan/${p.slug}`;
        const current = currentPlanId === p.id;
        return (
          <div key={p.id} className={cn("card card-hover relative flex flex-col overflow-hidden p-6", p.isPopular && "border-2 border-brand-300 bg-gradient-to-b from-brand-50/80 to-white shadow-glow lg:scale-[1.03]")}>
            {p.badge && <div className="animate-gradient absolute inset-x-0 top-0 bg-gradient-to-r from-brand-100 via-brand-200 to-brand-100 bg-[length:200%_200%] py-1 text-center text-[11px] font-bold tracking-widest text-brand-800">{p.badge}</div>}
            <div className={cn("flex items-start justify-between gap-4", p.badge && "mt-4")}>
              <div>
                <h3 className="text-xl font-bold">{p.name}</h3>
                {p.tagline && <p className="text-sm text-muted">{p.tagline}</p>}
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-extrabold text-navy-900">
                  {formatMoney(p.priceCents)}
                  {!p.isFree && <span className="text-sm font-medium text-muted">{INTERVAL_LABEL[p.interval]}</span>}
                </p>
                {p.priceNote && <p className="text-xs text-muted">{p.priceNote}</p>}
              </div>
            </div>
            <ul className="my-6 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-navy-800">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-auto">
              {current ? (
                <span className="btn-light w-full cursor-default">Your current plan</span>
              ) : (
                <Link href={href} className={cn("w-full", p.isPopular || !p.isFree ? "btn-primary py-3" : "btn-outline py-3")}>
                  {p.ctaLabel || (p.isFree ? "Get started" : `Upgrade to ${p.name}`)} <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
