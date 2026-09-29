/**
 * SEARCH PAGE  ( /search?type=&condition=&q=&city=&lat=&lng=&distance=… )
 * The interactive part lives in <SearchExperience> (client component).
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";
import { SearchExperience } from "@/components/search/SearchExperience";
import { SearchCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { getSearchPromo } from "@/lib/queries";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const loc = typeof sp.loc === "string" ? sp.loc : null;
  const cond = typeof sp.condition === "string" ? await prisma.condition.findUnique({ where: { slug: sp.condition } }) : null;
  const title = [cond ? `${cond.name} Specialists` : "Physical Therapists & Chiropractors", loc ? `near ${loc}` : null].filter(Boolean).join(" ");
  return pageMetadata("search", { title, description: `Compare licensed providers${loc ? ` near ${loc}` : ""}. See ratings, insurance and availability, then request an appointment.` });
}

/** Skeleton shown while the client search UI boots */
function SearchFallback() {
  return (
    <div className="container-x space-y-4 py-8">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-28" />
      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <Skeleton className="hidden h-96 lg:block" />
        <div className="space-y-4">
          <SearchCardSkeleton />
          <SearchCardSkeleton />
          <SearchCardSkeleton />
        </div>
      </div>
    </div>
  );
}

export default async function SearchPage() {
  const promo = await getSearchPromo();
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchExperience title="Find the Right Care Near You" promo={promo} />
    </Suspense>
  );
}
