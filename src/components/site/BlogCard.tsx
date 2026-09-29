/**
 * Blog post cards: "row" (home Helpful Resources) and "grid" (blog index).
 */
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { AppImage } from "@/components/ui/AppImage";
import { formatDate } from "@/lib/utils";

export type BlogCardData = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  coverAlt: string | null;
  category?: { name: string; slug: string } | null;
  publishedAt: Date | string | null;
  readingMinutes: number | null;
};

export function BlogCardRow({ post }: { post: BlogCardData }) {
  return (
    <article className="card card-hover group flex gap-4 p-3">
      <Link href={`/blog/${post.slug}`} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg sm:w-36">
        <AppImage src={post.coverImage} alt={post.coverAlt || post.title} fill sizes="144px" className="object-cover transition duration-500 group-hover:scale-110" />
      </Link>
      <div className="flex min-w-0 flex-col justify-center">
        <h3 className="line-clamp-2 text-[15px] font-semibold text-navy-800">
          <Link href={`/blog/${post.slug}`} className="hover:text-brand-700">
            {post.title}
          </Link>
        </h3>
        <Link href={`/blog/${post.slug}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-navy-600 hover:text-brand-700">
          Read Article <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

export function BlogCard({ post }: { post: BlogCardData }) {
  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link href={`/blog/${post.slug}`} className="relative aspect-[16/9] overflow-hidden">
        <AppImage src={post.coverImage} alt={post.coverAlt || post.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-300 group-hover:scale-105" />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {post.category && (
          <Link href={`/blog/category/${post.category.slug}`} className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
            {post.category.name}
          </Link>
        )}
        <h3 className="mt-1 text-lg leading-snug font-bold">
          <Link href={`/blog/${post.slug}`} className="hover:text-brand-700">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-muted">{post.excerpt}</p>}
        <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted">
          <span>{formatDate(post.publishedAt)}</span>
          {post.readingMinutes ? (
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {post.readingMinutes} min read
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
