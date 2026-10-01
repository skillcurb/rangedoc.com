/**
 * ADMIN – SITE SETTINGS ( /admin/settings?tab=general )
 * Tabs: General & branding, Social, Home page, Claim page, Marketplace,
 * Payments, Email (SMTP), reCAPTCHA, Search, Scripts.
 */
import Link from "next/link";
import { getSettings, type SettingsGroup } from "@/lib/settings";
import { PageHeader } from "@/components/panel/PanelUi";
import { SettingsForm, type SettingField } from "@/components/admin/SettingsForm";
import { cn, siteUrl } from "@/lib/utils";

export const metadata = { title: "Settings" };

const TABS: { key: SettingsGroup; label: string; description?: string; fields: SettingField[] }[] = [
  {
    key: "general",
    label: "General & Branding",
    fields: [
      { path: "siteName", label: "Site name", type: "text" },
      { path: "tagline", label: "Tagline", type: "text" },
      { path: "logo", label: "Logo (leave empty for text logo)", type: "image" },
      { path: "favicon", label: "Favicon", type: "image" },
      { path: "defaultOgImage", label: "Default social share image", type: "image" },
      { path: "footerAbout", label: "Footer description", type: "textarea" },
      { path: "copyright", label: "Copyright line ({year} = current year)", type: "text" },
      { path: "contactEmail", label: "Contact email", type: "text" },
      { path: "contactPhone", label: "Contact phone", type: "text" },
      { path: "address", label: "Address", type: "text" },
    ],
  },
  {
    key: "social",
    label: "Social Links",
    fields: ["facebook", "instagram", "youtube", "x", "linkedin", "tiktok"].map((k) => ({ path: k, label: k === "x" ? "X (Twitter)" : k.charAt(0).toUpperCase() + k.slice(1), type: "text" as const })),
  },
  {
    key: "home",
    label: "Home Page",
    description: "Hero and section headings. Section items are managed under Conditions, Popular searches, Cities, Providers (featured) and Blog posts (featured).",
    fields: [
      { path: "heroEyebrow", label: "Hero eyebrow", type: "text" },
      { path: "heroTitle", label: "Hero title", type: "text" },
      { path: "heroSubtitle", label: "Hero subtitle", type: "textarea" },
      { path: "heroImage", label: "Hero image", type: "image" },
      { path: "heroImageAlt", label: "Hero image alt text", type: "text" },
      { path: "heroScript", label: "Handwritten note", type: "text" },
      { path: "heroCardText", label: "Hero card text", type: "text" },
      { path: "whereHurtsTitle", label: "“Where does it hurt” title", type: "text" },
      { path: "whereHurtsSubtitle", label: "“Where does it hurt” subtitle", type: "text" },
      { path: "popularTitle", label: "Popular ways title", type: "text" },
      { path: "popularSubtitle", label: "Popular ways subtitle", type: "text" },
      { path: "nearTitle", label: "Find care near you title", type: "text" },
      { path: "nearSubtitle", label: "Find care near you subtitle", type: "text" },
      { path: "featuredTitle", label: "Featured providers title", type: "text" },
      { path: "resourcesTitle", label: "Helpful resources title", type: "text" },
      { path: "ctaTitle", label: "Bottom CTA title", type: "text" },
      { path: "ctaText", label: "Bottom CTA text", type: "text" },
      { path: "ctaButton", label: "Bottom CTA button", type: "text" },
    ],
  },
  {
    key: "claim",
    label: "Claim Page",
    description: "Steps and “why claim” items are Content Blocks; pricing is under Plans; reviews under Testimonials.",
    fields: [
      { path: "eyebrow", label: "Eyebrow", type: "text" },
      { path: "title", label: "Title", type: "text" },
      { path: "subtitle", label: "Subtitle", type: "textarea" },
      { path: "heroImage", label: "Hero image", type: "image" },
      { path: "heroScript", label: "Handwritten note", type: "text" },
      { path: "heroCard", label: "Hero card text", type: "text" },
      { path: "findTitle", label: "Find profile title", type: "text" },
      { path: "findSubtitle", label: "Find profile subtitle", type: "text" },
      { path: "secureTitle", label: "Security box title", type: "text" },
      { path: "secureText", label: "Security box text", type: "textarea" },
      { path: "whyTitle", label: "Why claim title", type: "text" },
      { path: "whySubtitle", label: "Why claim subtitle", type: "text" },
      { path: "pricingTitle", label: "Pricing title", type: "text" },
      { path: "pricingSubtitle", label: "Pricing subtitle", type: "text" },
      { path: "trustedLine", label: "Line under pricing", type: "text" },
      { path: "testimonialsTitle", label: "Testimonials title", type: "text" },
      { path: "testimonialsSubtitle", label: "Testimonials subtitle", type: "text" },
      { path: "ctaTitle", label: "Bottom CTA title", type: "text" },
      { path: "ctaSubtitle", label: "Bottom CTA subtitle", type: "text" },
      { path: "ctaButton", label: "Bottom CTA button", type: "text" },
    ],
  },
  {
    key: "products",
    label: "Marketplace",
    fields: [
      { path: "eyebrow", label: "Eyebrow", type: "text" },
      { path: "title", label: "Title", type: "text" },
      { path: "subtitle", label: "Subtitle", type: "text" },
      { path: "description", label: "Description", type: "textarea" },
      { path: "heroImage", label: "Hero image", type: "image" },
      { path: "heroScript", label: "Handwritten note", type: "text" },
      { path: "disclaimer", label: "Disclaimer", type: "textarea" },
      { path: "shippingFlatCents", label: "Flat shipping ($)", type: "money" },
      { path: "freeShippingOverCents", label: "Free shipping over ($)", type: "money" },
      { path: "taxPercent", label: "Sales tax (%)", type: "number" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    description: "Stripe handles Visa, Mastercard, Amex and more (hosted Stripe Checkout). PayPal uses PayPal Checkout. Secret keys are stored in the database and never shown again — leave blank to keep the saved key.",
    fields: [
      { path: "currency", label: "Currency (ISO code)", type: "text" },
      { path: "stripe.enabled", label: "Enable Stripe (cards)", type: "boolean" },
      { path: "stripe.label", label: "Stripe label at checkout", type: "text" },
      { path: "stripe.publishableKey", label: "Stripe publishable key", type: "text" },
      { path: "stripe.secretKey", label: "Stripe secret key", type: "secret" },
      { path: "paypal.enabled", label: "Enable PayPal", type: "boolean" },
      { path: "paypal.label", label: "PayPal label at checkout", type: "text" },
      { path: "paypal.mode", label: "PayPal mode", type: "select", options: ["sandbox", "live"] },
      { path: "paypal.clientId", label: "PayPal client ID", type: "text" },
      { path: "paypal.clientSecret", label: "PayPal client secret", type: "secret" },
      { path: "manual.enabled", label: "Enable pay later / invoice", type: "boolean" },
      { path: "manual.label", label: "Pay later label", type: "text" },
      { path: "manual.instructions", label: "Pay later instructions", type: "textarea" },
    ],
  },
  {
    key: "email",
    label: "Email (SMTP)",
    description: "Used for appointment requests, provider emails, order receipts, claim notices and password resets.",
    fields: [
      { path: "smtpHost", label: "SMTP host", type: "text" },
      { path: "smtpPort", label: "SMTP port", type: "number" },
      { path: "smtpSecure", label: "Use SSL/TLS (port 465)", type: "boolean" },
      { path: "smtpUser", label: "SMTP username", type: "text" },
      { path: "smtpPass", label: "SMTP password", type: "secret" },
      { path: "fromName", label: "From name", type: "text" },
      { path: "fromEmail", label: "From email", type: "text" },
      { path: "adminNotifyEmail", label: "Admin notification email", type: "text" },
    ],
  },
  {
    key: "captcha",
    label: "reCAPTCHA",
    description: "Google reCAPTCHA v2 (“I'm not a robot” checkbox) protects the contact form. Get keys at google.com/recaptcha/admin.",
    fields: [
      { path: "enabled", label: "Enable reCAPTCHA", type: "boolean" },
      { path: "siteKey", label: "Site key", type: "text" },
      { path: "secretKey", label: "Secret key", type: "secret" },
    ],
  },
  {
    key: "auth",
    label: "Social login",
    description:
      "Let admins sign in with Google or Facebook. Only emails that already belong to an admin user (Admin → Users) can sign in. Authorized redirect URLs to add in Google Cloud Console / Facebook for Developers: {site}/api/auth/oauth/google/callback and {site}/api/auth/oauth/facebook/callback",
    fields: [
      { path: "google.enabled", label: "Enable “Continue with Google”", type: "boolean" },
      { path: "google.clientId", label: "Google OAuth client ID", type: "text" },
      { path: "google.clientSecret", label: "Google OAuth client secret", type: "secret" },
      { path: "facebook.enabled", label: "Enable “Continue with Facebook”", type: "boolean" },
      { path: "facebook.appId", label: "Facebook App ID", type: "text" },
      { path: "facebook.appSecret", label: "Facebook App secret", type: "secret" },
    ],
  },
  {
    key: "search",
    label: "Search",
    fields: [
      { path: "defaultRadiusMiles", label: "Default search radius (miles)", type: "number" },
      { path: "pageSize", label: "Results loaded per scroll", type: "number" },
    ],
  },
  {
    key: "scripts",
    label: "Analytics & SEO",
    description:
      "Connect Google and Bing. Scripts load only on public pages. For Search Console / Bing Webmaster verification choose the “HTML tag” method and paste only the content value. Then submit {site}/sitemap.xml in both tools.",
    fields: [
      { path: "googleAnalyticsId", label: "Google Analytics 4 measurement ID (G-XXXXXXX)", type: "text" },
      { path: "googleTagManagerId", label: "Google Tag Manager ID (GTM-XXXXXXX)", type: "text" },
      { path: "googleSiteVerification", label: "Google Search Console verification code", type: "text" },
      { path: "bingSiteVerification", label: "Bing Webmaster Tools verification code (msvalidate.01)", type: "text" },
      { path: "microsoftClarityId", label: "Microsoft Clarity project ID (Bing analytics)", type: "text" },
      { path: "bingUetTagId", label: "Microsoft Advertising (Bing) UET tag ID", type: "text" },
      { path: "indexNowEnabled", label: "Notify Bing & other search engines (IndexNow) whenever content is saved", type: "boolean" },
    ],
  },
];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const settings = await getSettings();
  return (
    <div>
      <PageHeader title="Site Settings" />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="card h-fit p-2">
          {TABS.map((t) => (
            <Link key={t.key} href={`?tab=${t.key}`} className={cn("block rounded-lg px-3 py-2 text-sm font-medium", t.key === active.key ? "bg-brand-50 text-brand-800" : "text-navy-800 hover:bg-surface")}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="card p-6">
          <h2 className="text-xl font-bold">{active.label}</h2>
          {active.description && <p className="mt-1 text-sm break-words text-muted">{active.description.replaceAll("{site}", siteUrl("").replace(/\/$/, ""))}</p>}
          <SettingsForm key={active.key} group={active.key} fields={active.fields} values={settings[active.key] as Record<string, unknown>} />
        </div>
      </div>
    </div>
  );
}
