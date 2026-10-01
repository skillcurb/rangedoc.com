/**
 * Skeleton placeholders shown by <Suspense> while data loads.
 * They mirror the real layout so the page doesn't jump.
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Featured provider card (home page) */
export function ProviderCardSkeleton() {
  return (
    <div className="card flex gap-4 p-4">
      <Skeleton className="h-32 w-28 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

/** Search result card */
export function SearchCardSkeleton() {
  return (
    <div className="card flex flex-col gap-4 p-4 sm:flex-row">
      <Skeleton className="h-28 w-24 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      </div>
    </div>
  );
}

/** Generic tile grid (conditions, cities, products, blog posts) */
export function TileGridSkeleton({ count = 8, className, tileClassName }: { count?: number; className?: string; tileClassName?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("h-32", tileClassName)} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container-x space-y-6 py-10">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
