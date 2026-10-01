/**
 * Site settings stored in the `settings` table (key → JSON).
 * ------------------------------------------------------------------
 * Every group has sensible defaults so the site works on a fresh install.
 * Admin → Settings / Homepage / Claim page edit these values.
 *
 * NEVER pass the full settings object to client components – it contains
 * secret keys (Stripe, PayPal, SMTP, reCAPTCHA). Use `publicSettings()`.
 */
import "server-only";
import { cache } from "react";
import { db, t } from "@/lib/db";

export const DEFAULT_SETTINGS = {
  general: {
    siteName: "RangeDoc",
    tagline: "Find Care. Move Better.",
    logo: "",
    favicon: "",
    footerAbout: "A trusted directory for licensed physical therapists and chiropractors across the United States.",
    copyright: "© {year} RangeDoc. All rights reserved.",
    contactEmail: "hello@rangedoc.com",
    contactPhone: "(512) 555-0100",
    address: "100 Congress Ave, Austin, TX 78701",
    defaultOgImage: "/seed/og-default.svg",
  },
  social: { facebook: "#", instagram: "#", youtube: "#", x: "", linkedin: "", tiktok: "" },
  home: {
    heroEyebrow: "Real experts. A healthier you.",
    heroTitle: "Find the Right Care for Your Pain",
    heroSubtitle: "Discover licensed Physical Therapists and Chiropractors near you. Move better. Feel better. Get back to what you love.",
    heroImage: "/seed/hero.svg",
    heroImageAlt: "Person stretching a sore neck outdoors with mountains behind",
    heroScript: "Less pain. More living.",
    heroCardText: "Find local experts. Feel like you again.",
    whereHurtsTitle: "Where does it hurt?",
    whereHurtsSubtitle: "Find providers who specialize in your area of pain.",
    popularTitle: "Popular Ways to Find Care",
    popularSubtitle: "Explore common conditions and treatment areas.",
    nearTitle: "Find Care Near You",
    nearSubtitle: "Search by city or browse popular locations across the country.",
    featuredTitle: "Featured Providers",
    resourcesTitle: "Helpful Resources",
    ctaTitle: "Are you a Physical Therapist or Chiropractor?",
    ctaText: "Claim your free profile to reach more patients and grow your practice.",
    ctaButton: "Claim Your Free Profile",
  },
  claim: {
    eyebrow: "For Physical Therapists & Chiropractors",
    title: "Claim Your Profile",
    subtitle: "Take control of your online presence. Claim your free profile to connect with more patients, showcase your expertise, and grow your practice.",
    heroImage: "/seed/claim-hero.svg",
    heroScript: "More patients. A healthier tomorrow.",
    heroCard: "Join thousands of providers",
    findTitle: "Find Your Profile",
    findSubtitle: "Search for your name or practice to get started.",
    secureTitle: "Your information is secure",
    secureText: "We use industry-standard security to verify provider ownership and protect your data.",
    whyTitle: "Why Claim Your Profile?",
    whySubtitle: "A more complete profile helps the right patients find you — and choose you.",
    pricingTitle: "Choose the Plan That Fits Your Goals",
    pricingSubtitle: "Start with a free claimed profile, or upgrade to Pro for more tools to grow your practice.",
    trustedLine: "Trusted by physical therapists and chiropractors nationwide.",
    testimonialsTitle: "What Providers Are Saying",
    testimonialsSubtitle: "Real stories from providers growing their practice.",
    ctaTitle: "Join a network that moves health forward.",
    ctaSubtitle: "Claim your profile today and be part of a healthier tomorrow.",
    ctaButton: "Find Your Profile",
  },
  products: {
    eyebrow: "Tools for a stronger tomorrow",
    title: "Recovery Marketplace",
    subtitle: "Curated recovery tools by pain area.",
    description: "Discover trusted products to help you move better, recover faster, and feel your best. Chosen by experts. Backed by real results.",
    heroImage: "/seed/products-hero.svg",
    heroScript: "Small tools. Big progress.",
    disclaimer: "Our products are curated by licensed physical therapists and chiropractors to support your recovery journey. These products are for general wellness and recovery support and are not a substitute for professional medical advice.",
    shippingFlatCents: 599,
    freeShippingOverCents: 7500,
    taxPercent: 0,
  },
  payments: {
    currency: "USD",
    stripe: { enabled: false, publishableKey: "", secretKey: "", label: "Credit / Debit Card (Visa, Mastercard, Amex)" },
    paypal: { enabled: false, clientId: "", clientSecret: "", mode: "sandbox" as "sandbox" | "live", label: "PayPal" },
    manual: { enabled: true, label: "Pay later (invoice / bank transfer)", instructions: "We will email you payment instructions within 1 business day." },
  },
  email: {
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    fromName: "RangeDoc",
    fromEmail: "no-reply@rangedoc.com",
    adminNotifyEmail: "",
  },
  captcha: { enabled: false, siteKey: "", secretKey: "" },
  /** Admin social sign-in (OAuth). Only existing ADMIN accounts can sign in this way. */
  auth: {
    google: { enabled: false, clientId: "", clientSecret: "" },
    facebook: { enabled: false, appId: "", appSecret: "" },
  },
  search: { defaultRadiusMiles: 25, pageSize: 8 },
  /** Analytics & search-engine verification (public pages only) */
  scripts: {
    googleAnalyticsId: "", // GA4 measurement ID, e.g. G-XXXXXXX
    googleTagManagerId: "", // GTM-XXXXXXX
    googleSiteVerification: "", // Google Search Console "HTML tag" content value
    bingSiteVerification: "", // Bing Webmaster Tools "msvalidate.01" content value
    microsoftClarityId: "", // Microsoft Clarity project ID (heatmaps & session analytics)
    bingUetTagId: "", // Microsoft Advertising (Bing) UET tag ID
    indexNowEnabled: true, // ping Bing & co. (IndexNow) whenever content is saved
    indexNowKey: "", // created automatically
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
export type SettingsGroup = keyof Settings;

/** Deep-merge saved JSON on top of defaults (so new fields always exist) */
function merge<T>(base: T, saved: unknown): T {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? merge(b, v) : v;
  }
  return out as T;
}

/** Load all settings once per request */
export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.select().from(t.settings);
  const result = { ...DEFAULT_SETTINGS } as Settings;
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) {
      const key = row.key as SettingsGroup;
      (result as Record<string, unknown>)[key] = merge(DEFAULT_SETTINGS[key], row.value);
    }
  }
  return result;
});

/** Save one settings group */
export async function saveSettingsGroup(key: SettingsGroup, value: unknown) {
  // Insert, or replace the value when the key already exists (key is the primary key)
  await db.insert(t.settings).values({ key, value }).onDuplicateKeyUpdate({ set: { value } });
}

/** Safe subset for the browser (no secrets) */
export async function publicSettings() {
  const s = await getSettings();
  return {
    siteName: s.general.siteName,
    tagline: s.general.tagline,
    logo: s.general.logo,
    captchaSiteKey: s.captcha.enabled ? s.captcha.siteKey : "",
    paymentMethods: paymentMethodList(s),
    currency: s.payments.currency,
  };
}

/** Enabled payment methods (label only – no keys) */
export function paymentMethodList(s: Settings) {
  const list: { id: "stripe" | "paypal" | "manual"; label: string }[] = [];
  if (s.payments.stripe.enabled && s.payments.stripe.secretKey) list.push({ id: "stripe", label: s.payments.stripe.label });
  if (s.payments.paypal.enabled && s.payments.paypal.clientId) list.push({ id: "paypal", label: s.payments.paypal.label });
  if (s.payments.manual.enabled) list.push({ id: "manual", label: s.payments.manual.label });
  return list;
}
