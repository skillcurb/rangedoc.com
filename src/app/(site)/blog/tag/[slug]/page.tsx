/** BLOG TAG  ( /blog/tag/{slug} ) */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { BlogListing } from "@/components/blog/BlogListing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await prisma.blogTag.findUnique({ where: { slug: (await params).slug } });
  if (!t) return { title: "Tag not found" };
  return buildMetadata({ title: `Articles tagged “${t.name}”`, description: `All articles about ${t.name}.`, path: `/blog/tag/${t.slug}` });
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const t = await prisma.blogTag.findUnique({ where: { slug } });
  if (!t) notFound();
  return <BlogListing title={`#${t.name}`} subtitle={`Articles tagged “${t.name}”.`} where={{ published: true, tags: { some: { id: t.id } } }} page={Math.max(1, Number(page) || 1)} basePath={`/blog/tag/${t.slug}`} activeTag={t.slug} />;
}
