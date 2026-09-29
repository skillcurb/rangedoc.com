/** DASHBOARD → LOCATIONS ( /dashboard/locations ) – limited by plan */
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDashboard } from "@/lib/dashboard";
import { deleteLocation, makePrimaryLocation } from "@/lib/actions/provider";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { ActionButton } from "@/components/forms/FormKit";
import { LocationEditor, LocationRowEdit } from "@/components/dashboard/DashboardEditors";

export const metadata = { title: "Locations" };

export default async function LocationsPage() {
  const { provider, features } = await getDashboard();
  const [locations, cities] = await Promise.all([
    prisma.providerLocation.findMany({ where: { providerId: provider.id }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] }),
    prisma.city.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, stateCode: true, lat: true, lng: true } }),
  ]);
  const canAdd = locations.length < features.maxLocations;
  return (
    <div className="space-y-6">
      <PageHeader title="Practice Locations" subtitle={`Your plan includes ${features.maxLocations} location${features.maxLocations > 1 ? "s" : ""}. Only these are shown on your profile.`} />
      <Panel title="Your locations">
        {!locations.length && <p className="text-sm text-muted">No locations yet.</p>}
        <ul className="divide-y divide-line">
          {locations.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 py-4">
              <MapPin className="size-5 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-900">
                  {l.name} {l.isPrimary && <span className="badge ml-2 bg-brand-50 text-brand-800">Primary</span>}
                </p>
                <p className="text-sm text-muted">
                  {l.address}, {l.cityName}, {l.state} {l.zip}
                </p>
              </div>
              {!l.isPrimary && (
                <ActionButton run={makePrimaryLocation.bind(null, l.id)} className="btn-light btn-sm">
                  <Star className="size-3.5" /> Make primary
                </ActionButton>
              )}
              <LocationRowEdit cities={cities} value={l} />
              <ActionButton run={deleteLocation.bind(null, l.id)} confirm="Delete this location?" className="btn-light btn-sm text-red-600">
                Delete
              </ActionButton>
            </li>
          ))}
        </ul>
      </Panel>
      {canAdd ? (
        <Panel title="Add a location">
          <LocationEditor cities={cities} />
        </Panel>
      ) : (
        <div className="card flex flex-wrap items-center gap-3 bg-amber-50 p-4 text-sm text-navy-800">
          You&apos;ve reached your plan&apos;s location limit.
          <Link href="/dashboard/billing" className="btn-primary btn-sm ml-auto">
            Upgrade to add more locations
          </Link>
        </div>
      )}
    </div>
  );
}
