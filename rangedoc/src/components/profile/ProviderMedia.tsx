/**
 * Video + social link display pieces (used on the public profile and in
 * the dashboard preview).
 *  - <VideoEmbed>      responsive YouTube / Vimeo / MP4 player (lazy loaded)
 *  - <SocialLinks>     round brand buttons for the provider's networks
 */
import { parseVideo } from "@/lib/video";
import { FacebookIcon, InstagramIcon, LinkedinIcon, PinterestIcon, XIcon, YoutubeIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/utils";

export function VideoEmbed({ url, title, className }: { url: string; title: string; className?: string }) {
  const v = parseVideo(url);
  if (!v) return null;
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-xl bg-navy-950 shadow-card", className)}>
      {v.kind === "file" ? (
        <video src={v.embedUrl} controls preload="metadata" className="absolute inset-0 h-full w-full" aria-label={title} />
      ) : (
        <iframe
          src={v.embedUrl}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      )}
    </div>
  );
}

type Links = { facebookUrl?: string | null; xUrl?: string | null; linkedinUrl?: string | null; pinterestUrl?: string | null; youtubeUrl?: string | null; instagramUrl?: string | null };

const NETWORKS = [
  { key: "facebookUrl", label: "Facebook", Icon: FacebookIcon, color: "from-[#1877F2] to-[#0f5bd0]" },
  { key: "xUrl", label: "X", Icon: XIcon, color: "from-neutral-800 to-black" },
  { key: "linkedinUrl", label: "LinkedIn", Icon: LinkedinIcon, color: "from-[#0A66C2] to-[#084c91]" },
  { key: "pinterestUrl", label: "Pinterest", Icon: PinterestIcon, color: "from-[#E60023] to-[#b0001b]" },
  { key: "youtubeUrl", label: "YouTube", Icon: YoutubeIcon, color: "from-[#FF0000] to-[#c40000]" },
  { key: "instagramUrl", label: "Instagram", Icon: InstagramIcon, color: "from-[#f58529] via-[#dd2a7b] to-[#8134af]" },
] as const;

export function SocialLinks({ links, name }: { links: Links; name: string }) {
  const list = NETWORKS.filter((n) => links[n.key]);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(({ key, label, Icon, color }) => (
        <a
          key={key}
          href={links[key]!}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`${name} on ${label}`}
          title={label}
          className={cn("grid size-9 place-items-center rounded-full bg-gradient-to-br text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", color)}
        >
          <Icon className="size-4" />
        </a>
      ))}
    </div>
  );
}
