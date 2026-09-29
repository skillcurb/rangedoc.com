"use client";
/**
 * Save + Share buttons (paid-plan feature on provider profiles).
 *
 * Save: browsers do not allow websites to create bookmarks directly, so we
 * (1) keep the provider in the visitor's "Saved providers" list (/saved)
 * and (2) show the keyboard shortcut to bookmark the page (Ctrl/⌘ + D).
 *
 * Share: native share sheet on mobile, or a popup with social links + copy link.
 */
import { useState } from "react";
import { Check, Copy, Heart, Mail, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { Modal } from "@/components/ui/Modal";
import { FacebookIcon, LinkedinIcon, WhatsappIcon, XIcon } from "@/components/ui/SocialIcons";
import { useSavedProviders, type SavedProvider } from "@/lib/client/stores";
import { track } from "@/lib/client/track";
import { cn } from "@/lib/utils";

export function SaveButton({ provider, className }: { provider: SavedProvider; className?: string }) {
  const { isSaved, toggle } = useSavedProviders();
  const saved = isSaved(provider.id);
  return (
    <button
      type="button"
      className={cn("flex items-center gap-1.5 text-sm font-medium text-navy-800 hover:text-brand-700", className)}
      onClick={() => {
        const nowSaved = toggle(provider);
        if (nowSaved) {
          track("SAVE_CLICK", { providerId: provider.id });
          const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
          toast.success(`Saved! Find it under "Saved providers". Press ${isMac ? "⌘" : "Ctrl"} + D to bookmark this page in your browser.`, { duration: 6000 });
        } else toast("Removed from saved providers");
      }}
      aria-pressed={saved}
    >
      <Heart className={cn("size-4", saved && "fill-red-500 text-red-500")} /> {saved ? "Saved" : "Save"}
    </button>
  );
}

export function ShareButton({ providerId, title, className }: { providerId: number; title: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";
  const enc = encodeURIComponent;
  const links = [
    { label: "Facebook", Icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, color: "bg-[#1877F2]" },
    { label: "X", Icon: XIcon, href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, color: "bg-black" },
    { label: "LinkedIn", Icon: LinkedinIcon, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, color: "bg-[#0A66C2]" },
    { label: "WhatsApp", Icon: WhatsappIcon, href: `https://wa.me/?text=${enc(`${title} ${url}`)}`, color: "bg-[#25D366]" },
  ];

  return (
    <>
      <button
        type="button"
        className={cn("flex items-center gap-1.5 text-sm font-medium text-navy-800 hover:text-brand-700", className)}
        onClick={async () => {
          track("SHARE_CLICK", { providerId });
          setOpen(true);
        }}
      >
        <Share2 className="size-4" /> Share
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Share this profile" size="sm">
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-4 gap-3">
            {links.map(({ label, Icon, href, color }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 text-xs text-navy-800">
                <span className={cn("grid size-12 place-items-center rounded-full text-white", color)}>
                  <Icon className="size-5" />
                </span>
                {label}
              </a>
            ))}
          </div>
          <a href={`mailto:?subject=${enc(title)}&body=${enc(url)}`} className="btn-light w-full">
            <Mail className="size-4" /> Share by email
          </a>
          <div className="flex gap-2">
            <input readOnly value={url} className="input text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Profile link" />
            <button
              type="button"
              className="btn-primary shrink-0"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                toast.success("Link copied");
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
            </button>
          </div>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <button type="button" className="btn-light w-full" onClick={() => navigator.share({ title, url }).catch(() => undefined)}>
              <Share2 className="size-4" /> More options…
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
