/**
 * DASHBOARD → VIDEOS & SOCIAL ( /dashboard/videos ) – paid-plan features
 *  - Intro video (shown in "About" on the profile)
 *  - Video gallery (YouTube / Vimeo links or uploaded videos)
 *  - Social network links: Facebook, X, LinkedIn, Pinterest, YouTube, Instagram
 */
import { prisma } from "@/lib/prisma";
import { getDashboard } from "@/lib/dashboard";
import { PageHeader, Panel, UpgradeNotice } from "@/components/panel/PanelUi";
import { MediaLinksForm, VideoGalleryEditor } from "@/components/dashboard/VideoEditors";

export const metadata = { title: "Videos & Social" };

export default async function VideosPage() {
  const { provider, features } = await getDashboard();
  if (!features.allowVideo && !features.allowSocialLinks && !features.maxVideos) {
    return <UpgradeNotice feature="Videos & social links" text="Add an intro video, a video gallery and links to your Facebook, X, LinkedIn, Pinterest and YouTube pages." />;
  }
  const videos = await prisma.providerVideo.findMany({ where: { providerId: provider.id }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader title="Videos & Social" subtitle="Videos help patients get to know you before they book." />
      <Panel title="Intro video & social networks">
        <MediaLinksForm
          allowVideo={features.allowVideo}
          allowSocial={features.allowSocialLinks}
          values={{
            videoUrl: provider.videoUrl,
            facebookUrl: provider.facebookUrl,
            xUrl: provider.xUrl,
            linkedinUrl: provider.linkedinUrl,
            pinterestUrl: provider.pinterestUrl,
            youtubeUrl: provider.youtubeUrl,
            instagramUrl: provider.instagramUrl,
          }}
        />
      </Panel>
      <Panel title="Video gallery" action={<span className="text-sm text-muted">{videos.length} / {features.maxVideos}</span>}>
        {features.maxVideos > 0 ? (
          <VideoGalleryEditor videos={videos.map((v) => ({ id: v.id, title: v.title, url: v.url, thumbnail: v.thumbnail }))} canAdd={videos.length < features.maxVideos} />
        ) : (
          <p className="text-sm text-muted">Your plan doesn&apos;t include a video gallery.</p>
        )}
      </Panel>
    </div>
  );
}
