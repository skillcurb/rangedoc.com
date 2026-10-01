/** BLOG / RESOURCES  ( /blog?page=&q= ) */
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { BlogListing } from "@/components/blog/BlogListing";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("blog", { title: "Helpful Resources", description: "Guides and articles from licensed physical therapists and chiropractors." });
}

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const { page, q } = await searchParams;
  return (
    <BlogListing
      title="Helpful Resources"
      subtitle="Practical guides from licensed providers to help you understand your pain and recover faster."
      where={{ published: true, ...(q ? { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] } : {}) }}
      page={Math.max(1, Number(page) || 1)}
      basePath="/blog"
      q={q}
    />
  );
}
