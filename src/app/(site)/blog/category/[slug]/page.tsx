/** BLOG CATEGORY  ( /blog/category/{slug} ) */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { BlogListing } from "@/components/blog/BlogListing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await prisma.blogCategory.findUnique({ where: { slug: (await params).slug } });
  if (!c) return { title: "Category not found" };
  return buildMetadata({ title: c.metaTitle || `${c.name} Articles`, description: c.metaDescription || c.description, keywords: c.metaKeywords, image: c.ogImage, path: `/blog/category/${c.slug}` });
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page } = await searchParams;
  const c = await prisma.blogCategory.findUnique({ where: { slug } });
  if (!c) notFound();
  return <BlogListing title={c.name} subtitle={c.description} where={{ published: true, categoryId: c.id }} page={Math.max(1, Number(page) || 1)} basePath={`/blog/category/${c.slug}`} activeCategory={c.slug} />;
}
