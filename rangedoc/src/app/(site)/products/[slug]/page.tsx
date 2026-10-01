/**
 * PRODUCT DETAIL  ( /products/{slug} )
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ShieldCheck, Truck } from "lucide-react";
import { db, t, eq, ne, and, isNull } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { formatMoney, jsonStringArray, siteUrl, splitList, stripHtml, truncate } from "@/lib/utils";
import { AppImage } from "@/components/ui/AppImage";
import { Breadcrumbs } from "@/components/ui/Misc";
import { TrackOnMount } from "@/components/site/Tracker";
import { ProductCard, QuantityAddToCart } from "@/components/products/ProductParts";

type Props = { params: Promise<{ slug: string }> };

async function getProduct(slug: string) {
  return db.query.products.findFirst({ where: eq(t.products.slug, slug), with: { category: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Product not found" };
  return buildMetadata({
    title: p.metaTitle || p.name,
    description: p.metaDescription || p.shortDescription || truncate(stripHtml(p.description), 160),
    keywords: p.metaKeywords || [p.name, p.brand, p.productType, p.category?.name].filter(Boolean).join(", "),
    image: p.ogImage || p.image,
    path: `/products/${p.slug}`,
  });
}

export default async function ProductPage({ params }: Props) {
  const p = await getProduct((await params).slug);
  if (!p || !p.active) notFound();
  const s = await getSettings();
  const images = [p.image, ...jsonStringArray(p.images)].filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
  const related = await db.query.products.findMany({
    // Same category (or also uncategorised when this product has none)
    where: and(eq(t.products.active, true), p.categoryId == null ? isNull(t.products.categoryId) : eq(t.products.categoryId, p.categoryId), ne(t.products.id, p.id)),
    with: { category: true },
    limit: 4,
  });
  const card = { id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription, priceCents: p.priceCents, compareAtCents: p.compareAtCents, image: p.image, category: p.category?.name ?? null, inStock: p.stock == null || p.stock > 0 };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: images.map((i) => (i.startsWith("http") ? i : siteUrl(i))),
    description: p.shortDescription,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    sku: p.sku,
    offers: { "@type": "Offer", price: (p.priceCents / 100).toFixed(2), priceCurrency: s.payments.currency, availability: card.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: siteUrl(`/products/${p.slug}`) },
  };

  return (
    <div className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackOnMount type="PRODUCT_VIEW" meta={{ productId: p.id }} />
      <Breadcrumbs items={[{ label: "Recovery Marketplace", href: "/products" }, ...(p.category ? [{ label: p.category.name, href: `/products?category=${p.category.slug}` }] : []), { label: p.name }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="card relative aspect-square overflow-hidden">
            <AppImage src={images[0]} alt={p.name} fill priority sizes="(max-width:1024px) 100vw, 600px" className="object-contain p-6" />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <div key={img} className="card relative aspect-square overflow-hidden">
                  <AppImage src={img} alt={`${p.name} image ${i + 1}`} fill sizes="100px" className="object-contain p-1" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {p.brand && <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">{p.brand}</p>}
          <h1 className="mt-1 text-3xl font-extrabold">{p.name}</h1>
          <p className="mt-3 text-2xl font-bold text-navy-900">
            {formatMoney(p.priceCents)}
            {p.compareAtCents && p.compareAtCents > p.priceCents && <span className="ml-3 text-base font-normal text-muted line-through">{formatMoney(p.compareAtCents)}</span>}
          </p>
          {p.shortDescription && <p className="mt-3 text-navy-700">{p.shortDescription}</p>}
          <div className="mt-6">
            <QuantityAddToCart product={card} />
          </div>
          <ul className="mt-6 space-y-2 text-sm text-navy-800">
            <li className="flex items-center gap-2"><Truck className="size-4 text-brand-600" /> Free shipping on orders over {formatMoney(s.products.freeShippingOverCents)}</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-600" /> Curated by licensed PTs &amp; chiropractors</li>
            {splitList(p.useCases).map((u) => (
              <li key={u} className="flex items-center gap-2"><Check className="size-4 text-brand-600" /> {u}</li>
            ))}
          </ul>
          {p.description && <div className="prose-rd mt-8 border-t border-line pt-6" dangerouslySetInnerHTML={{ __html: p.description }} />}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-2xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={{ id: r.id, slug: r.slug, name: r.name, shortDescription: r.shortDescription, priceCents: r.priceCents, compareAtCents: r.compareAtCents, image: r.image, category: r.category?.name ?? null, inStock: r.stock == null || r.stock > 0 }} />
            ))}
          </div>
        </section>
      )}
      <p className="mt-10 text-center text-sm">
        <Link href="/products" className="link">
          ← Back to all products
        </Link>
      </p>
    </div>
  );
}
