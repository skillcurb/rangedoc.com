/**
 * Shared read queries used by several pages.
 */
import "server-only";
import { db, t, eq, and, asc, desc } from "@/lib/db";

/** Promo card under the search map: newest featured article */
export async function getSearchPromo() {
  const post = await db.query.blogPosts.findFirst({
    where: and(eq(t.blogPosts.published, true), eq(t.blogPosts.featured, true)),
    orderBy: [desc(t.blogPosts.publishedAt)],
  });
  return post
    ? { title: "Not sure PT or Chiropractor?", text: "Learn the differences, common treatments, and which might be right for you.", href: `/blog/${post.slug}`, cta: "Read the guide", image: post.coverImage }
    : null;
}

/** The plan marked "free" in Admin → Plans (used for claimed free profiles) */
export async function getFreePlan() {
  const plan = await db.query.plans.findFirst({
    where: and(eq(t.plans.isFree, true), eq(t.plans.active, true)),
    orderBy: [asc(t.plans.sortOrder)],
  });
  return plan ?? null;
}
