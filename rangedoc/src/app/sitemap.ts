/**
 * /sitemap.xml – generated from the database on every request, so new or
 * updated providers, cities, conditions, articles, products and pages are
 * included the moment they are saved (see src/lib/sitemap.ts).
 */
import type { MetadataRoute } from "next";
import { buildSitemap } from "@/lib/sitemap";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap();
}
