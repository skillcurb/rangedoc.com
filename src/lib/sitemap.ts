/**
 * Sitemap generation + search-engine notification.
 * ------------------------------------------------------------------
 * /sitemap.xml is rebuilt from the database, so anything you save
 * (provider, city, condition, blog post, product, page…) is included
 * immediately. Every save also calls `onContentChanged()`, which:
 *   1. marks the sitemap as regenerated (time + URL count, shown in
 *      Admin → Sitemap & Indexing),
 *   2. notifies search engines through IndexNow (Bing, Yandex, Seznam,
 *      Naver…) so new pages are crawled within minutes.
 * Google reads the sitemap you submit once in Search Console and re-checks
 * it automatically (Google retired its "ping" endpoint in 2023).
 */
import "server-only";
import crypto from "node:crypto";
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings, saveSettingsGroup } from "@/lib/settings";
import { SEO_PAGES } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";

const abs = (u: string | null | undefined) => (u ? (u.startsWith("http") ? u : siteUrl(u)) : null);

/** Build every sitemap entry (with lastmod and image URLs for Google Images) */
export async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  const [seo, providers, conditions, cities, posts, cats, tags, products, pages] = await Promise.all([
    prisma.pageSeo.findMany({ select: { pageKey: true, noIndex: true } }),
    prisma.provider.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true, photo: true, gallery: { select: { url: true }, take: 10 } } }),
    prisma.condition.findMany({ where: { active: true }, select: { slug: true, image: true } }),
    prisma.city.findMany({ where: { active: true }, select: { slug: true, image: true } }),
    prisma.blogPost.findMany({ where: { published: true }, select: { slug: true, updatedAt: true, coverImage: true } }),
    prisma.blogCategory.findMany({ select: { slug: true } }),
    prisma.blogTag.findMany({ select: { slug: true } }),
    prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true, image: true } }),
    prisma.cmsPage.findMany({ where: { published: true }, select: { slug: true, updatedAt: true, heroImage: true } }),
  ]);
  const hidden = new Set(seo.filter((s) => s.noIndex).map((s) => s.pageKey));
  // Fixed pages that are worth indexing (login, cart… are excluded)
  const indexable = SEO_PAGES.filter((p) => !["login", "register", "cart", "checkout", "saved"].includes(p.key) && !hidden.has(p.key));
  const img = (...urls: (string | null | undefined)[]) => {
    const list = urls.map(abs).filter((u): u is string => !!u);
    return list.length ? list : undefined;
  };

  return [
    ...indexable.map((p) => ({ url: siteUrl(p.path), changeFrequency: "daily" as const, priority: p.path === "/" ? 1 : 0.8 })),
    ...providers.map((p) => ({ url: siteUrl(`/provider/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7, images: img(p.photo, ...p.gallery.map((g) => g.url)) })),
    ...conditions.map((c) => ({ url: siteUrl(`/conditions/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7, images: img(c.image) })),
    ...cities.map((c) => ({ url: siteUrl(`/locations/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.7, images: img(c.image) })),
    ...posts.map((p) => ({ url: siteUrl(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.6, images: img(p.coverImage) })),
    ...cats.map((c) => ({ url: siteUrl(`/blog/category/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.4 })),
    ...tags.map((t) => ({ url: siteUrl(`/blog/tag/${t.slug}`), changeFrequency: "weekly" as const, priority: 0.3 })),
    ...products.map((p) => ({ url: siteUrl(`/products/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.5, images: img(p.image) })),
    ...pages.map((p) => ({ url: siteUrl(`/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.3, images: img(p.heroImage) })),
  ];
}

// ─────────────────────────── IndexNow ───────────────────────────

/** The IndexNow key (created automatically the first time it's needed) */
export async function getIndexNowKey() {
  const s = await getSettings();
  if (s.scripts.indexNowKey) return s.scripts.indexNowKey;
  const key = crypto.randomBytes(16).toString("hex");
  await saveSettingsGroup("scripts", { ...s.scripts, indexNowKey: key });
  return key;
}

async function submitIndexNow(paths: string[]) {
  const s = await getSettings();
  if (!s.scripts.indexNowEnabled || !paths.length) return { sent: false as const, reason: "disabled" };
  const base = siteUrl("/");
  const host = new URL(base).host;
  if (/^(localhost|127\.|0\.0\.0\.0)/.test(host)) return { sent: false as const, reason: "localhost" };
  const key = await getIndexNowKey();
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation: siteUrl("/indexnow-key.txt"), urlList: [...new Set(paths.map((p) => siteUrl(p)))].slice(0, 10000) }),
  });
  return { sent: res.ok, reason: `HTTP ${res.status}` };
}

// ───────────────────── Called after every save ─────────────────────

/**
 * Call after anything public changes. `paths` are the affected public URLs
 * (e.g. ["/provider/dr-sarah-kim-austin"]). The sitemap itself always comes
 * straight from the database, so this records the rebuild and pings search
 * engines. Never throws – saving must not fail because a ping failed.
 */
export async function onContentChanged(paths: string[] = ["/"]) {
  try {
    const entries = await buildSitemap();
    const ping = await submitIndexNow([...paths, "/sitemap.xml"]).catch((e) => ({ sent: false as const, reason: String(e) }));
    await prisma.setting.upsert({
      where: { key: "sitemap_state" },
      create: { key: "sitemap_state", value: { updatedAt: new Date().toISOString(), urlCount: entries.length, lastPaths: paths.slice(0, 20), lastPing: ping } },
      update: { value: { updatedAt: new Date().toISOString(), urlCount: entries.length, lastPaths: paths.slice(0, 20), lastPing: ping } },
    });
  } catch (e) {
    console.error("[sitemap]", e);
  }
}

export async function getSitemapState() {
  const row = await prisma.setting.findUnique({ where: { key: "sitemap_state" } });
  return (row?.value ?? null) as null | { updatedAt: string; urlCount: number; lastPaths: string[]; lastPing: { sent: boolean; reason?: string } };
}
