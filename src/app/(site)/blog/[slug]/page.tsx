/**
 * BLOG POST  ( /blog/{slug} ) – article, rating, comments, share, related posts.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MessageCircle } from "lucide-react";
import { db, t, eq, ne, and, asc, desc, sql, pluck } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { formatDate, siteUrl, stripHtml, truncate } from "@/lib/utils";
import { AppImage } from "@/components/ui/AppImage";
import { Breadcrumbs } from "@/components/ui/Misc";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { BlogCard } from "@/components/site/BlogCard";
import { TrackOnMount } from "@/components/site/Tracker";
import { BlogRating, CommentForm } from "@/components/blog/BlogInteractions";
import { ArticleShare } from "@/components/blog/ArticleShare";

type Props = { params: Promise<{ slug: string }> };

async function getPost(slug: string) {
  const post = await db.query.blogPosts.findFirst({ where: eq(t.blogPosts.slug, slug), with: { category: true, tags: { with: { tag: true } } } });
  // Tags come back as join rows → flatten to BlogTag[]
  return post ? { ...post, tags: pluck(post.tags, "tag") } : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPost((await params).slug);
  if (!p || !p.published) return { title: "Article not found" };
  return buildMetadata({
    title: p.metaTitle || p.title,
    description: p.metaDescription || p.excerpt || truncate(stripHtml(p.content), 160),
    keywords: p.metaKeywords || p.tags.map((tag) => tag.name).join(", "),
    image: p.ogImage || p.coverImage,
    path: `/blog/${p.slug}`,
    type: "article",
  });
}

async function Comments({ postId }: { postId: number }) {
  const comments = await db.query.blogComments.findMany({ where: and(eq(t.blogComments.postId, postId), eq(t.blogComments.status, "APPROVED")), orderBy: [asc(t.blogComments.createdAt)] });
  return (
    <div className="space-y-4">
      {comments.length === 0 && <p className="text-sm text-muted">No comments yet. Start the conversation!</p>}
      {comments.map((c) => (
        <article key={c.id} className="rounded-lg bg-surface p-4">
          <p className="text-sm font-semibold text-navy-900">
            {c.name} <span className="ml-2 text-xs font-normal text-muted">{formatDate(c.createdAt)}</span>
          </p>
          <p className="mt-1 text-sm whitespace-pre-line text-navy-700">{c.body}</p>
        </article>
      ))}
    </div>
  );
}

async function Related({ id, categoryId }: { id: number; categoryId: number | null }) {
  const posts = await db.query.blogPosts.findMany({
    where: and(eq(t.blogPosts.published, true), ne(t.blogPosts.id, id), categoryId ? eq(t.blogPosts.categoryId, categoryId) : undefined),
    orderBy: [desc(t.blogPosts.publishedAt)],
    limit: 3,
    with: { category: true },
  });
  if (!posts.length) return null;
  return (
    <section className="mt-12">
      <h2 className="mb-4 text-2xl font-bold">Related articles</h2>
      <div className="grid gap-5 md:grid-cols-3">
        {posts.map((p) => (
          <BlogCard key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}

export default async function BlogPostPage({ params }: Props) {
  const p = await getPost((await params).slug);
  if (!p || !p.published) notFound();
  // Count the view (simple counter – detailed stats are in analytics)
  await db.update(t.blogPosts).set({ views: sql`${t.blogPosts.views} + 1` }).where(eq(t.blogPosts.id, p.id));
  const avg = p.ratingCount ? p.ratingSum / p.ratingCount : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    image: p.coverImage ? (p.coverImage.startsWith("http") ? p.coverImage : siteUrl(p.coverImage)) : undefined,
    datePublished: p.publishedAt?.toISOString(),
    dateModified: p.updatedAt.toISOString(),
    author: { "@type": "Organization", name: p.authorName || "Editorial Team" },
    aggregateRating: p.ratingCount ? { "@type": "AggregateRating", ratingValue: avg.toFixed(1), ratingCount: p.ratingCount } : undefined,
  };

  return (
    <article className="container-x py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackOnMount type="BLOG_VIEW" meta={{ postId: p.id }} />
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ label: "Resources", href: "/blog" }, ...(p.category ? [{ label: p.category.name, href: `/blog/category/${p.category.slug}` }] : []), { label: p.title }]} />
        <h1 className="mt-4 text-3xl leading-tight font-extrabold sm:text-5xl">{p.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted">
          {p.authorName && <span className="font-medium text-navy-800">{p.authorName}</span>}
          <span>{formatDate(p.publishedAt)}</span>
          {p.readingMinutes ? (
            <span className="flex items-center gap-1">
              <Clock className="size-4" /> {p.readingMinutes} min read
            </span>
          ) : null}
          <ArticleShare title={p.title} />
        </div>
      </div>
      {p.coverImage && (
        <div className="relative mx-auto mt-6 aspect-[16/8] max-w-5xl overflow-hidden rounded-2xl">
          <AppImage src={p.coverImage} alt={p.coverAlt || p.title} fill priority sizes="(max-width:1024px) 100vw, 1024px" className="object-cover" />
        </div>
      )}
      <div className="mx-auto max-w-3xl">
        {/* Content is written by admins in the rich-text editor */}
        <div className="prose-rd mt-8" dangerouslySetInnerHTML={{ __html: p.content }} />
        {p.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {p.tags.map((tag) => (
              <Link key={tag.id} href={`/blog/tag/${tag.slug}`} className="chip hover:border-brand-400">
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
        <div className="mt-8">
          <BlogRating postId={p.id} avg={avg} count={p.ratingCount} />
        </div>
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <MessageCircle className="size-5 text-brand-600" /> Comments
          </h2>
          <Suspense fallback={<ListSkeleton rows={2} />}>
            <Comments postId={p.id} />
          </Suspense>
          <div className="mt-6">
            <h3 className="mb-3 font-bold">Leave a comment</h3>
            <CommentForm postId={p.id} />
          </div>
        </section>
      </div>
      <Suspense fallback={null}>
        <Related id={p.id} categoryId={p.categoryId} />
      </Suspense>
    </article>
  );
}
