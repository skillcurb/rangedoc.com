/**
 * Shared read queries used by several pages.
 */
import "server-only";
import { prisma } from "@/lib/prisma";

/** Promo card under the search map: newest featured article */
export async function getSearchPromo() {
  const post = await prisma.blogPost.findFirst({ where: { published: true, featured: true }, orderBy: { publishedAt: "desc" } });
  return post
    ? { title: "Not sure PT or Chiropractor?", text: "Learn the differences, common treatments, and which might be right for you.", href: `/blog/${post.slug}`, cta: "Read the guide", image: post.coverImage }
    : null;
}

/** The plan marked "free" in Admin → Plans (used for claimed free profiles) */
export async function getFreePlan() {
  return prisma.plan.findFirst({ where: { isFree: true, active: true }, orderBy: { sortOrder: "asc" } });
}
