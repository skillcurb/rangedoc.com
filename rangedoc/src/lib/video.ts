/**
 * Video helpers – turn a pasted link into something we can embed.
 * Supports YouTube (watch, youtu.be, shorts, embed), Vimeo and direct
 * video files (uploaded MP4 / WebM / MOV from the media library).
 */
export type VideoInfo = {
  kind: "youtube" | "vimeo" | "file" | "unknown";
  embedUrl: string;
  thumbnail: string | null;
};

export function parseVideo(url: string | null | undefined): VideoInfo | null {
  if (!url) return null;
  const u = url.trim();

  // YouTube
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) {
    return { kind: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`, thumbnail: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` };
  }

  // Vimeo
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { kind: "vimeo", embedUrl: `https://player.vimeo.com/video/${vm[1]}`, thumbnail: null };

  // Uploaded / direct video file
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)) return { kind: "file", embedUrl: u, thumbnail: null };

  return { kind: "unknown", embedUrl: u, thumbnail: null };
}

/** Only allow http(s) links for social profiles */
export function cleanUrl(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const SOCIAL_FIELDS = [
  { key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/yourpractice" },
  { key: "xUrl", label: "X (Twitter)", placeholder: "https://x.com/yourpractice" },
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/in/you" },
  { key: "pinterestUrl", label: "Pinterest", placeholder: "https://pinterest.com/yourpractice" },
  { key: "youtubeUrl", label: "YouTube", placeholder: "https://youtube.com/@yourpractice" },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/yourpractice" },
] as const;

export type SocialKey = (typeof SOCIAL_FIELDS)[number]["key"];
