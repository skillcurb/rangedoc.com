/**
 * Plan / feature gating.
 * ------------------------------------------------------------------
 * What a provider profile can do depends on:
 *   - UNCLAIMED profile      → most limited ("listing only")
 *   - CLAIMED + free plan    → the free plan's capabilities (Admin → Plans)
 *   - CLAIMED + paid plan    → the paid plan's capabilities (while not expired)
 *
 * Search ranking uses the same logic: paid first, then claimed free, then
 * unclaimed – always last.
 */
import type { Plan } from "@/generated/prisma/client";

export type PlanFeatures = {
  planName: string;
  isPaid: boolean;
  maxPhotos: number;
  maxLocations: number;
  maxFaqs: number;
  allowReviews: boolean;
  allowShareSave: boolean;
  allowRatingDisplay: boolean;
  allowVideo: boolean;
  maxVideos: number;
  allowSocialLinks: boolean;
  allowAnalytics: boolean;
  allowAllFaqs: boolean;
  featuredBadge: boolean;
  searchPriority: number;
};

/** Capabilities of a profile nobody has claimed yet */
export const UNCLAIMED_FEATURES: PlanFeatures = {
  planName: "Unclaimed",
  isPaid: false,
  maxPhotos: 4,
  maxLocations: 1,
  maxFaqs: 3,
  allowReviews: false,
  allowShareSave: false,
  allowRatingDisplay: false,
  allowVideo: false,
  maxVideos: 0,
  allowSocialLinks: false,
  allowAnalytics: false,
  allowAllFaqs: false,
  featuredBadge: false,
  searchPriority: 0,
};

type ProviderPlanInput = {
  claimStatus: "UNCLAIMED" | "PENDING" | "CLAIMED";
  planExpiresAt?: Date | null;
  plan?: Pick<Plan, keyof Omit<PlanFeatures, "planName" | "isPaid"> | "name" | "isFree"> | null;
};

/** Is the provider's paid plan currently active? */
export function hasActivePaidPlan(p: ProviderPlanInput) {
  return !!p.plan && !p.plan.isFree && (!p.planExpiresAt || new Date(p.planExpiresAt) > new Date());
}

function fromPlan(plan: NonNullable<ProviderPlanInput["plan"]>, isPaid: boolean): PlanFeatures {
  return {
    planName: plan.name,
    isPaid,
    maxPhotos: plan.maxPhotos,
    maxLocations: plan.maxLocations,
    maxFaqs: plan.maxFaqs,
    allowReviews: plan.allowReviews,
    allowShareSave: plan.allowShareSave,
    allowRatingDisplay: plan.allowRatingDisplay,
    allowVideo: plan.allowVideo,
    maxVideos: plan.maxVideos,
    allowSocialLinks: plan.allowSocialLinks,
    allowAnalytics: plan.allowAnalytics,
    allowAllFaqs: plan.allowAllFaqs,
    featuredBadge: plan.featuredBadge,
    searchPriority: plan.searchPriority,
  };
}

/**
 * Work out the effective features for a provider.
 * `freePlan` = the plan marked "isFree" in Admin → Plans (used for claimed
 * providers without an active paid plan).
 */
export function providerFeatures(p: ProviderPlanInput, freePlan?: ProviderPlanInput["plan"] | null): PlanFeatures {
  if (p.claimStatus !== "CLAIMED") return UNCLAIMED_FEATURES;
  if (hasActivePaidPlan(p) && p.plan) return fromPlan(p.plan, true);
  if (freePlan) return fromPlan(freePlan, false);
  return { ...UNCLAIMED_FEATURES, planName: "Free" };
}

/**
 * Search ranking tier – bigger number = shown first.
 *   paid: 1000 + plan.searchPriority, claimed free: 100, unclaimed: 0
 */
export function rankTier(p: ProviderPlanInput) {
  if (p.claimStatus === "CLAIMED" && hasActivePaidPlan(p)) return 1000 + (p.plan?.searchPriority ?? 0);
  if (p.claimStatus === "CLAIMED") return 100;
  return 0;
}

/** Date a plan bought now would expire */
export function planExpiryFrom(interval: "MONTH" | "YEAR" | "LIFETIME", from = new Date()) {
  if (interval === "LIFETIME") return null;
  const d = new Date(from);
  if (interval === "MONTH") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

export const INTERVAL_LABEL: Record<string, string> = { MONTH: "/month", YEAR: "/year", LIFETIME: " one-time" };
