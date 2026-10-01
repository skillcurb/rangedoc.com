/** BLOG TAG  ( /blog/tag/{slug} ) */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, t, eq, and, inArray } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { BlogListing } from "@/components/blog/BlogListing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tag = await db.query.blogTags.findFirst({ where: eq(t.blogTags.slug, (await params).slug) });
  if (!tag) return { title: "Tag not found" };
  return buildMetadata({ title: `Articles tagged “${tag.name}”`, description: `All articles about ${tag.name}.`, path: `/blog/tag/${tag.slug}` });
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const tag = await db.query.blogTags.findFirst({ where: eq(t.blogTags.slug, slug) });
  if (!tag) notFound();
  // Posts linked to this tag through the blog_post_tags join table
  const tagged = inArray(t.blogPosts.id, db.select({ id: t.blogPostTags.postId }).from(t.blogPostTags).where(eq(t.blogPostTags.tagId, tag.id)));
  return <BlogListing title={`#${tag.name}`} subtitle={`Articles tagged “${tag.name}”.`} where={and(eq(t.blogPosts.published, true), tagged)} page={Math.max(1, Number(page) || 1)} basePath={`/blog/tag/${tag.slug}`} activeTag={tag.slug} />;
}
