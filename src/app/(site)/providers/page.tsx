/**
 * ALL PROVIDERS  ( /providers )
 * Works exactly like the search page, with its own title and SEO entry.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { SearchExperience } from "@/components/search/SearchExperience";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getSearchPromo } from "@/lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("providers", { title: "All Providers", description: "Browse every licensed physical therapist and chiropractor in our directory." });
}

export default async function ProvidersPage() {
  const promo = await getSearchPromo();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchExperience title="All Providers" promo={promo} />
    </Suspense>
  );
}
