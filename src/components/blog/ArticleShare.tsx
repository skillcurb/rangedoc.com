"use client";
/** Share links for blog articles (Facebook, X, LinkedIn, copy link). */
import { Link2 } from "lucide-react";
import toast from "react-hot-toast";
import { FacebookIcon, LinkedinIcon, XIcon } from "@/components/ui/SocialIcons";

export function ArticleShare({ title }: { title: string }) {
  const share = (base: string) => {
    const url = encodeURIComponent(window.location.href);
    window.open(base.replace("{url}", url).replace("{title}", encodeURIComponent(title)), "_blank", "noopener,width=600,height=500");
  };
  return (
    <span className="ml-auto flex items-center gap-2">
      <button type="button" onClick={() => share("https://www.facebook.com/sharer/sharer.php?u={url}")} aria-label="Share on Facebook" className="grid size-8 place-items-center rounded-full bg-navy-50 text-navy-800 hover:bg-brand-100">
        <FacebookIcon className="size-4" />
      </button>
      <button type="button" onClick={() => share("https://twitter.com/intent/tweet?url={url}&text={title}")} aria-label="Share on X" className="grid size-8 place-items-center rounded-full bg-navy-50 text-navy-800 hover:bg-brand-100">
        <XIcon className="size-3.5" />
      </button>
      <button type="button" onClick={() => share("https://www.linkedin.com/sharing/share-offsite/?url={url}")} aria-label="Share on LinkedIn" className="grid size-8 place-items-center rounded-full bg-navy-50 text-navy-800 hover:bg-brand-100">
        <LinkedinIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied");
        }}
        aria-label="Copy link"
        className="grid size-8 place-items-center rounded-full bg-navy-50 text-navy-800 hover:bg-brand-100"
      >
        <Link2 className="size-4" />
      </button>
    </span>
  );
}
