"use client";
/**
 * Records a PAGE_VIEW on every client-side navigation.
 * Mounted once in the public site layout.
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/client/track";

export function PageViewTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    track("PAGE_VIEW");
  }, [pathname, search]);
  return null;
}

/** Fire one event when a page mounts (e.g. PROFILE_VIEW, BLOG_VIEW) */
export function TrackOnMount({ type, providerId, meta }: { type: string; providerId?: number; meta?: Record<string, unknown> }) {
  useEffect(() => {
    track(type, { providerId, meta });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, providerId]);
  return null;
}
