/**
 * SEO helpers – build Next.js `Metadata` objects.
 * ------------------------------------------------------------------
 * Fixed pages (home, search, claim, …) read their tags from the PageSeo
 * table, editable in Admin → SEO. Dynamic pages (provider, blog post,
 * product, city, condition) pass their own fields.
 */
import "server-only";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { siteUrl, splitList } from "@/lib/utils";

/** List of fixed pages that get an entry in Admin → SEO */
export const SEO_PAGES: { key: string; label: string; path: string }[] = [
  { key: "home", label: "Home page", path: "/" },
  { key: "search", label: "Search results", path: "/search" },
  { key: "providers", label: "All providers", path: "/providers" },
  { key: "claim", label: "Claim your profile", path: "/claim-your-profile" },
  { key: "products", label: "Recovery marketplace", path: "/products" },
  { key: "blog", label: "Blog / resources", path: "/blog" },
  { key: "conditions", label: "Browse by condition", path: "/conditions" },
  { key: "locations", label: "Browse by location", path: "/locations" },
  { key: "contact", label: "Contact us", path: "/contact" },
  { key: "login", label: "Provider login", path: "/login" },
  { key: "register", label: "Provider registration", path: "/register" },
  { key: "cart", label: "Cart", path: "/cart" },
  { key: "checkout", label: "Checkout", path: "/checkout" },
  { key: "saved", label: "Saved providers", path: "/saved" },
];

type SeoInput = {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  image?: string | null;
  path?: string;
  canonical?: string | null;
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
};

/** Turn relative image paths into absolute URLs (required by OG scrapers) */
function absolute(url: string | null | undefined) {
  if (!url) return undefined;
  return url.startsWith("http") ? url : siteUrl(url);
}

/** Build a complete Metadata object (title, description, keywords, OG, Twitter, canonical) */
export async function buildMetadata(input: SeoInput): Promise<Metadata> {
  const settings = await getSettings();
  const siteName = settings.general.siteName;
  const title = input.title || siteName;
  const description = input.description || settings.general.footerAbout;
  const image = absolute(input.image || settings.general.defaultOgImage);
  const canonical = input.canonical || (input.path ? siteUrl(input.path) : undefined);

  return {
    title,
    description,
    keywords: splitList(input.keywords),
    alternates: canonical ? { canonical } : undefined,
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      type: input.type === "article" ? "article" : "website",
      siteName,
      title: input.ogTitle || title,
      description: input.ogDescription || description,
      url: canonical,
      images: image ? [{ url: image, width: 1200, height: 630, alt: input.ogTitle || title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: input.ogTitle || title,
      description: input.ogDescription || description,
      images: image ? [image] : undefined,
    },
  };
}

/** Metadata for a fixed page – reads Admin → SEO values with fallbacks */
export async function pageMetadata(pageKey: string, fallback: { title: string; description?: string }): Promise<Metadata> {
  const seo = await prisma.pageSeo.findUnique({ where: { pageKey } }).catch(() => null);
  const page = SEO_PAGES.find((p) => p.key === pageKey);
  return buildMetadata({
    title: seo?.metaTitle || fallback.title,
    description: seo?.metaDescription || fallback.description,
    keywords: seo?.metaKeywords,
    ogTitle: seo?.ogTitle,
    ogDescription: seo?.ogDescription,
    image: seo?.ogImage,
    canonical: seo?.canonical,
    noIndex: seo?.noIndex,
    path: page?.path,
  });
}
