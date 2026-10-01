/**
 * ADMIN – MEDIA LIBRARY ( /admin/media )
 * Upload images (PNG, JPG, WebP, GIF, SVG, ICO), logos, videos and PDFs.
 * The same library opens as a popup from every image field in the admin.
 */
import { PageHeader } from "@/components/panel/PanelUi";
import { MediaLibrary } from "@/components/media/MediaLibrary";

export const metadata = { title: "Media Library" };

export default function MediaPage() {
  return (
    <div>
      <PageHeader title="Media Library" subtitle="Drag & drop files to upload. Images are converted to optimized WebP automatically. Click a file to edit its alt text (important for SEO)." />
      <div className="card h-[calc(100vh-13rem)] overflow-hidden">
        <MediaLibrary accept="all" />
      </div>
    </div>
  );
}
