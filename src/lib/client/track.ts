"use client";
/**
 * Browser-side analytics helper.
 * ------------------------------------------------------------------
 *   track("CALL_CLICK", { providerId: 12 })
 * Sends the event to /api/track with navigator.sendBeacon so it is not
 * lost when the visitor navigates away (e.g. clicking "Visit website").
 */
import { getStoredLocation } from "@/lib/client/location";

type TrackOptions = { providerId?: number; meta?: Record<string, unknown> };

/** A new session id per browser tab session (used to count repeat visits) */
function sessionId() {
  try {
    let id = sessionStorage.getItem("rd_sid");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("rd_sid", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function visitorId() {
  const match = document.cookie.match(/(?:^|;\s*)rd_vid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function track(type: string, opts: TrackOptions = {}) {
  if (typeof window === "undefined") return;
  const loc = getStoredLocation();
  const body = JSON.stringify({
    events: [{ type, providerId: opts.providerId, meta: opts.meta, path: location.pathname + location.search }],
    sessionId: sessionId(),
    referrer: document.referrer || null,
    geo: loc ? { city: loc.label, lat: loc.lat, lng: loc.lng } : null,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
}
