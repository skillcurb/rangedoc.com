/** BROWSE BY CONDITION  ( /conditions ) */
import type { Metadata } from "next";
import Link from "next/link";
import { db, t, eq, asc, count } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { AppImage } from "@/components/ui/AppImage";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("conditions", { title: "Browse by Condition", description: "Find physical therapists and chiropractors who specialize in your condition or pain area." });
}

export default async function ConditionsPage() {
  // Active conditions + how many providers are linked to each (one grouped count on the join table)
  const [rows, counts] = await Promise.all([
    db.query.conditions.findMany({ where: eq(t.conditions.active, true), orderBy: [asc(t.conditions.sortOrder)] }),
    db.select({ conditionId: t.providerConditions.conditionId, n: count() }).from(t.providerConditions).groupBy(t.providerConditions.conditionId),
  ]);
  const countBy = new Map(counts.map((r) => [r.conditionId, r.n]));
  const conditions = rows.map((c) => ({ ...c, _count: { providers: countBy.get(c.id) ?? 0 } }));
  return (
    <div className="container-x py-10">
      <h1 className="text-4xl font-extrabold">Browse by Condition</h1>
      <p className="mt-2 text-navy-700">Choose where it hurts to find providers who specialize in it.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {conditions.map((c) => (
          <Link key={c.id} href={`/conditions/${c.slug}`} className="card group overflow-hidden transition hover:shadow-pop">
            <div className="relative aspect-[5/4] bg-gradient-to-b from-navy-50 to-white">
              <AppImage src={c.image} alt={`${c.name} pain area`} fill sizes="200px" className="object-contain p-3 transition group-hover:scale-105" />
            </div>
            <div className="p-3">
              <h2 className="text-base font-bold">{c.name}</h2>
              <p className="text-xs text-muted">{c._count.providers} providers</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
