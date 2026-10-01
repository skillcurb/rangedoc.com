/**
 * Blog listing used by /blog, /blog/category/{slug} and /blog/tag/{slug}.
 * Posts stream in behind a skeleton; sidebar lists categories and tags.
 */
import { Suspense } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { SQL } from "drizzle-orm";
import { db, t, eq, desc, asc, count } from "@/lib/db";
import { BlogCard } from "@/components/site/BlogCard";
import { EmptyState, Pagination } from "@/components/ui/Misc";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

const PER_PAGE = 9;

async function Posts({ where, page, basePath, q }: { where: SQL | undefined; page: number; basePath: string; q?: string }) {
  const [total, posts] = await Promise.all([
    db.$count(t.blogPosts, where),
    db.query.blogPosts.findMany({ where, orderBy: [desc(t.blogPosts.publishedAt)], offset: (page - 1) * PER_PAGE, limit: PER_PAGE, with: { category: { columns: { name: true, slug: true } } } }),
  ]);
  if (!posts.length) return <EmptyState title="No articles found" text="Try another category or search term." />;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((p) => (
          <BlogCard key={p.id} post={p} />
        ))}
      </div>
      <Pagination page={page} totalPages={Math.ceil(total / PER_PAGE)} hrefFor={(n) => `${basePath}?page=${n}${q ? `&q=${encodeURIComponent(q)}` : ""}`} />
    </>
  );
}

export async function BlogListing({ title, subtitle, where, page, basePath, q, activeCategory, activeTag }: {
  title: string;
  subtitle?: string | null;
  /** Drizzle filter on blog_posts, e.g. and(eq(t.blogPosts.published, true), eq(t.blogPosts.categoryId, 3)) */
  where: SQL | undefined;
  page: number;
  basePath: string;
  q?: string;
  activeCategory?: string;
  activeTag?: string;
}) {
  const [cats, postCounts, tags] = await Promise.all([
    db.query.blogCategories.findMany({ orderBy: [asc(t.blogCategories.name)] }),
    // Published posts per category (one grouped count query)
    db.select({ categoryId: t.blogPosts.categoryId, n: count() }).from(t.blogPosts).where(eq(t.blogPosts.published, true)).groupBy(t.blogPosts.categoryId),
    db.query.blogTags.findMany({ orderBy: [asc(t.blogTags.name)] }),
  ]);
  const countBy = new Map(postCounts.map((r) => [r.categoryId, r.n]));
  const categories = cats.map((c) => ({ ...c, _count: { posts: countBy.get(c.id) ?? 0 } }));
  return (
    <>
      <section className="bg-gradient-to-b from-navy-50 to-white">
        <div className="container-x py-10">
          <p className="eyebrow">Helpful resources</p>
          <h1 className="mt-2 text-4xl font-extrabold">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-navy-700">{subtitle}</p>}
        </div>
      </section>
      <div className="container-x grid gap-8 py-8 lg:grid-cols-[1fr_260px]">
        <div>
          <Suspense key={`${basePath}-${page}-${q}`} fallback={<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80" />)}</div>}>
            <Posts where={where} page={page} basePath={basePath} q={q} />
          </Suspense>
        </div>
        <aside className="space-y-6">
          <form action="/blog" className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={q} placeholder="Search articles…" className="input pl-9" />
          </form>
          <div className="card p-4">
            <h2 className="mb-3 font-bold">Categories</h2>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/blog" className={cn("flex justify-between hover:text-brand-700", !activeCategory && !activeTag && "font-semibold text-brand-700")}>
                  All articles
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/blog/category/${c.slug}`} className={cn("flex justify-between text-navy-800 hover:text-brand-700", activeCategory === c.slug && "font-semibold text-brand-700")}>
                    {c.name} <span className="text-muted">{c._count.posts}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-4">
            <h2 className="mb-3 font-bold">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link key={tag.id} href={`/blog/tag/${tag.slug}`} className={cn("chip hover:border-brand-400", activeTag === tag.slug && "border-brand-600 bg-brand-50 text-brand-800")}>
                  #{tag.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
