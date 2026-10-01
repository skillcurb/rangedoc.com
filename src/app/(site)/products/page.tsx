/**
 * RECOVERY MARKETPLACE  ( /products?category=&type=&price=&brand=&use=&sort= )
 * Visitors can buy without an account (guest checkout).
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Info, MessageCircle } from "lucide-react";
import type { SQL } from "drizzle-orm";
import { db, t, eq, and, or, like, inArray, gte, lt, asc, desc } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { pageMetadata, buildMetadata } from "@/lib/seo";
import { splitList } from "@/lib/utils";
import { AppImage } from "@/components/ui/AppImage";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/Misc";
import { MountainBand, ScriptNote } from "@/components/site/Decor";
import { ProductCard, ProductFilters, SortSelect } from "@/components/products/ProductParts";
import { cn } from "@/lib/utils";

type SP = Record<string, string | undefined>;
type Props = { searchParams: Promise<SP> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const s = await getSettings();
  const cat = sp.category && !sp.category.includes(",") ? await db.query.productCategories.findFirst({ where: eq(t.productCategories.slug, sp.category) }) : null;
  if (cat) {
    return buildMetadata({ title: cat.metaTitle || `${cat.name} Recovery Products`, description: cat.metaDescription || cat.description, keywords: cat.metaKeywords, image: cat.ogImage, path: `/products?category=${cat.slug}` });
  }
  return pageMetadata("products", { title: s.products.title, description: s.products.description });
}

/** Product grid – streams in with a skeleton while filtering */
async function ProductGrid({ sp }: { sp: SP }) {
  // Build the filter as a list of SQL conditions (all must match)
  const conds: SQL[] = [eq(t.products.active, true)];
  const cats = splitList(sp.category);
  // Category by slug → subquery on product_categories
  if (cats.length) conds.push(inArray(t.products.categoryId, db.select({ id: t.productCategories.id }).from(t.productCategories).where(inArray(t.productCategories.slug, cats))));
  const types = splitList(sp.type);
  if (types.length) conds.push(inArray(t.products.productType, types));
  if (sp.brand) conds.push(eq(t.products.brand, sp.brand));
  const uses = splitList(sp.use);
  // useCases is a comma separated text column → match any of the chosen use cases
  if (uses.length) conds.push(or(...uses.map((u) => like(t.products.useCases, `%${u}%`)))!);
  if (sp.price) {
    const [min, max] = sp.price.split("-").map((x) => (x ? Number(x) : undefined));
    if (min != null) conds.push(gte(t.products.priceCents, min));
    if (max != null) conds.push(lt(t.products.priceCents, max));
  }
  const orderBy =
    sp.sort === "price-asc" ? [asc(t.products.priceCents)] : sp.sort === "price-desc" ? [desc(t.products.priceCents)] : sp.sort === "newest" ? [desc(t.products.createdAt)] : [desc(t.products.featured), asc(t.products.sortOrder)];

  const products = await db.query.products.findMany({ where: and(...conds), orderBy, with: { category: true }, limit: 60 });
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-navy-900">{products.length} products</p>
        <div className="flex items-center gap-2 text-sm text-muted">
          Sort by <SortSelect />
        </div>
      </div>
      {products.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              p={{ id: p.id, slug: p.slug, name: p.name, shortDescription: p.shortDescription, priceCents: p.priceCents, compareAtCents: p.compareAtCents, image: p.image, category: p.category?.name ?? null, inStock: p.stock == null || p.stock > 0 }}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No products match these filters" action={<Link href="/products" className="btn-primary">Clear filters</Link>} />
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-80" />
      ))}
    </div>
  );
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const s = await getSettings();
  const pr = s.products;
  const [categories, trust, howto, meta] = await Promise.all([
    db.query.productCategories.findMany({ orderBy: [asc(t.productCategories.sortOrder)] }),
    db.query.contentBlocks.findMany({ where: and(eq(t.contentBlocks.section, "products_trust"), eq(t.contentBlocks.active, true)), orderBy: [asc(t.contentBlocks.sortOrder)] }),
    db.query.contentBlocks.findMany({ where: and(eq(t.contentBlocks.section, "products_howto"), eq(t.contentBlocks.active, true)), orderBy: [asc(t.contentBlocks.sortOrder)] }),
    db.query.products.findMany({ where: eq(t.products.active, true), columns: { productType: true, brand: true, useCases: true } }),
  ]);
  const uniq = (arr: (string | null)[]) => [...new Set(arr.filter(Boolean) as string[])].sort();
  const facets = {
    categories: categories.map((c) => ({ slug: c.slug, name: c.name })),
    types: uniq(meta.map((m) => m.productType)),
    brands: uniq(meta.map((m) => m.brand)),
    useCases: uniq(meta.flatMap((m) => splitList(m.useCases))),
  };
  const activeCat = sp.category;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-50">
        <AppImage src={pr.heroImage} alt="Person stretching outdoors" fill priority sizes="100vw" className="object-cover object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10" />
        <div className="relative container-x py-12">
          <ScriptNote text={pr.heroScript} className="absolute top-8 right-8 hidden lg:block" />
          <p className="eyebrow">{pr.eyebrow}</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{pr.title}</h1>
          <p className="mt-2 text-xl font-bold text-navy-900">{pr.subtitle}</p>
          <p className="mt-2 max-w-xl text-navy-700">{pr.description}</p>
          <ul className="mt-6 flex flex-wrap gap-6">
            {trust.map((tb) => (
              <li key={tb.id} className="flex items-center gap-2">
                <Icon name={tb.icon} className="size-7 text-brand-600" />
                <span className="text-sm">
                  <b className="block text-navy-900">{tb.title}</b>
                  <span className="text-xs text-navy-700">{tb.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Shop by pain area */}
      <section className="border-b border-line bg-white">
        <div className="no-scrollbar container-x flex items-center gap-2 overflow-x-auto py-4">
          <h2 className="mr-3 shrink-0 text-lg font-bold">Shop by pain area</h2>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={activeCat === c.slug ? "/products" : `/products?category=${c.slug}`}
              className={cn("flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium", activeCat === c.slug ? "border-brand-600 bg-brand-600 text-white" : "border-line text-navy-800 hover:border-brand-400")}
              scroll={false}
            >
              <Icon name={c.icon} className="size-4" /> {c.name}
            </Link>
          ))}
        </div>
      </section>

      <div className="container-x grid gap-6 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ProductFilters facets={facets} />
          </Suspense>
        </aside>
        <div>
          <Suspense key={JSON.stringify(sp)} fallback={<GridSkeleton />}>
            <ProductGrid sp={sp} />
          </Suspense>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="container-x">
        <div className="flex flex-col gap-3 rounded-xl bg-brand-50/70 p-4 sm:flex-row sm:items-center">
          <Info className="size-6 shrink-0 text-brand-600" />
          <p className="flex-1 text-sm text-navy-800">{pr.disclaimer}</p>
          <Link href="/search" className="flex items-center gap-2 text-sm font-medium text-navy-700">
            <MessageCircle className="size-5" /> Talk to a provider <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {/* How to choose */}
      {howto.length > 0 && (
        <section className="container-x py-12">
          <p className="eyebrow">Recovery resources</p>
          <div className="mt-1 mb-6 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold sm:text-3xl">How to choose recovery products</h2>
            <Link href="/blog" className="link hidden text-sm sm:block">
              View all recovery resources →
            </Link>
          </div>
          <div className="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howto.map((h) => (
              <div key={h.id} className="card card-hover flex gap-3 p-4">
                <span className="icon-bubble size-11 shrink-0"><Icon name={h.icon} className="size-5" /></span>
                <div>
                  <h3 className="text-sm font-bold">{h.title}</h3>
                  <p className="text-xs text-navy-700">{h.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <MountainBand>
        <div className="container-x relative py-14 text-center">
          <ScriptNote text="Move better every day." className="absolute top-6 left-6 hidden text-xl lg:block" />
          <ScriptNote text="Support your journey." className="absolute top-6 right-6 hidden text-xl lg:block" />
          <h2 className="text-2xl font-bold">Tools today. A healthier tomorrow.</h2>
          <Link href="/products" className="btn-primary mt-4">
            Explore Recovery Marketplace <ArrowRight className="size-4" />
          </Link>
        </div>
      </MountainBand>
    </>
  );
}
