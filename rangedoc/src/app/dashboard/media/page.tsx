/** DASHBOARD → PHOTOS & MEDIA ( /dashboard/media ) – gallery limited by plan */
import Link from "next/link";
import { db, t, eq, asc } from "@/lib/db";
import { getDashboard } from "@/lib/dashboard";
import { PageHeader, Panel } from "@/components/panel/PanelUi";
import { GalleryManager } from "@/components/dashboard/DashboardEditors";

export const metadata = { title: "Photos & Media" };

export default async function MediaPage() {
  const { provider, features } = await getDashboard();
  const images = await db.query.galleryImages.findMany({ where: eq(t.galleryImages.providerId, provider.id), orderBy: [asc(t.galleryImages.sortOrder)] });
  const canAdd = images.length < features.maxPhotos;
  return (
    <div className="space-y-6">
      <PageHeader title="Photos & Media" subtitle="Clinic photos appear on your profile. The first photo is the large cover image." />
      <Panel>
        <GalleryManager images={images.map((g) => ({ id: g.id, url: g.url, alt: g.alt }))} max={features.maxPhotos} canAdd={canAdd} />
        {!canAdd && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-navy-800">
            Photo limit reached for the {features.planName} plan.{" "}
            <Link href="/dashboard/billing" className="link">
              Upgrade for unlimited photos
            </Link>
            .
          </p>
        )}
      </Panel>
      <p className="text-xs text-muted">Files are stored in your private folder (providers/{provider.id}/gallery). Images are automatically optimized to WebP.</p>
    </div>
  );
}
