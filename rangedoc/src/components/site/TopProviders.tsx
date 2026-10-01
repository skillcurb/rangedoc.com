/**
 * "Top providers" grid for city and condition landing pages.
 * Uses the same ranking as search (paid → claimed → unclaimed).
 */
import { searchProviders, type SearchInput } from "@/lib/search";
import { ProviderCard } from "@/components/site/ProviderCard";
import { EmptyState } from "@/components/ui/Misc";

export async function TopProviders({ input }: { input: SearchInput }) {
  const { results } = await searchProviders({ ...input, pageSize: 6, page: 1 });
  if (!results.length) return <EmptyState title="No providers listed yet" text="Check back soon or search a nearby city." />;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {results.map((r) => (
        <ProviderCard key={r.id} p={{ slug: r.slug, name: r.name, typeLabel: r.typeLabel, photo: r.photo, licenseVerified: r.licenseVerified, conditions: r.conditions, specialties: r.insurances.length ? [`Accepts ${r.insurances[0]}`] : [], city: r.cityLabel, education: null }} />
      ))}
    </div>
  );
}
