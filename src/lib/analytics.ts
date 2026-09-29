/**
 * Analytics – recording and reporting.
 * ------------------------------------------------------------------
 * Every tracked interaction becomes a row in AnalyticsEvent and updates
 * the anonymous Visitor row (device, browser, location, visit count).
 *
 * Visitor location comes from (first available):
 *   1. CDN geo headers (Vercel `x-vercel-ip-*`, Cloudflare `cf-ip*`)
 *   2. The visitor's chosen / detected location sent by the browser
 */
import "server-only";
import { UAParser } from "ua-parser-js";
import { Prisma, type EventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const EVENT_TYPES = [
  "PAGE_VIEW", "SEARCH", "SEARCH_IMPRESSION", "SEARCH_CLICK", "PROFILE_VIEW", "APPOINTMENT_CLICK",
  "APPOINTMENT_SUBMIT", "CALL_CLICK", "EMAIL_CLICK", "EMAIL_SUBMIT", "WEBSITE_CLICK", "GALLERY_VIEW",
  "PHOTO_VIEW", "SHARE_CLICK", "SAVE_CLICK", "DIRECTIONS_CLICK", "PRODUCT_VIEW", "ADD_TO_CART", "BLOG_VIEW",
] as const satisfies readonly EventType[];

export const EVENT_LABEL: Record<string, string> = {
  PAGE_VIEW: "Page views",
  SEARCH: "Searches",
  SEARCH_IMPRESSION: "Search appearances",
  SEARCH_CLICK: "Search clicks",
  PROFILE_VIEW: "Profile views",
  APPOINTMENT_CLICK: "Appointment clicks",
  APPOINTMENT_SUBMIT: "Appointment requests",
  CALL_CLICK: "Call clicks",
  EMAIL_CLICK: "Email clicks",
  EMAIL_SUBMIT: "Emails sent",
  WEBSITE_CLICK: "Website clicks",
  GALLERY_VIEW: "Gallery views",
  PHOTO_VIEW: "Photo views",
  SHARE_CLICK: "Shares",
  SAVE_CLICK: "Saves",
  DIRECTIONS_CLICK: "Directions clicks",
  PRODUCT_VIEW: "Product views",
  ADD_TO_CART: "Add to cart",
  BLOG_VIEW: "Article views",
};

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless/i;

export type TrackContext = {
  visitorId?: string | null;
  sessionId?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  headers?: Headers;
  geo?: { city?: string; region?: string; country?: string; lat?: number; lng?: number } | null;
};

export type TrackEvent = {
  type: EventType;
  providerId?: number | null;
  path?: string | null;
  meta?: Record<string, unknown> | null;
};

function geoFromHeaders(h?: Headers) {
  if (!h) return {};
  const dec = (v: string | null) => (v ? decodeURIComponent(v) : undefined);
  return {
    country: dec(h.get("x-vercel-ip-country") || h.get("cf-ipcountry")),
    region: dec(h.get("x-vercel-ip-country-region") || h.get("cf-region")),
    city: dec(h.get("x-vercel-ip-city") || h.get("cf-ipcity")),
    lat: Number(h.get("x-vercel-ip-latitude") || h.get("cf-iplatitude")) || undefined,
    lng: Number(h.get("x-vercel-ip-longitude") || h.get("cf-iplongitude")) || undefined,
  };
}

/** Store one or more events for the current visitor */
export async function recordEvents(events: TrackEvent[], ctx: TrackContext) {
  if (!events.length) return;
  const ua = ctx.userAgent ?? "";
  if (BOT_RE.test(ua)) return; // don't count crawlers

  const parsed = UAParser(ua);
  const device = parsed.device.type === "mobile" ? "Mobile" : parsed.device.type === "tablet" ? "Tablet" : "Desktop";
  const browser = parsed.browser.name ?? null;
  const os = parsed.os.name ?? null;
  const headerGeo = geoFromHeaders(ctx.headers);
  const geo = {
    country: headerGeo.country || ctx.geo?.country || null,
    region: headerGeo.region || ctx.geo?.region || null,
    city: headerGeo.city || ctx.geo?.city || null,
    lat: headerGeo.lat ?? ctx.geo?.lat ?? null,
    lng: headerGeo.lng ?? ctx.geo?.lng ?? null,
  };
  const visitorId = ctx.visitorId?.slice(0, 64) || null;
  const pageViews = events.filter((e) => e.type === "PAGE_VIEW").length;

  // Upsert the visitor (counts repeat visits by session id)
  if (visitorId) {
    const existing = await prisma.visitor.findUnique({ where: { id: visitorId } });
    if (existing) {
      const newSession = !!ctx.sessionId && ctx.sessionId !== existing.lastSessionId;
      await prisma.visitor.update({
        where: { id: visitorId },
        data: {
          lastSeenAt: new Date(),
          pageViews: { increment: pageViews },
          ...(newSession ? { visitCount: { increment: 1 }, lastSessionId: ctx.sessionId } : {}),
          device,
          browser,
          os,
          ...(geo.city ? { city: geo.city, region: geo.region, country: geo.country, lat: geo.lat, lng: geo.lng } : {}),
        },
      });
    } else {
      // Two requests from a brand-new visitor can arrive at the same time,
      // so ignore "already exists" and just bump the counters instead.
      await prisma.visitor
        .create({
          data: {
            id: visitorId,
            pageViews,
            lastSessionId: ctx.sessionId ?? null,
            device,
            browser,
            os,
            ...geo,
            referrer: ctx.referrer?.slice(0, 500) || null,
          },
        })
        .catch(async (e: { code?: string }) => {
          if (e?.code !== "P2002") throw e;
          await prisma.visitor.update({ where: { id: visitorId }, data: { lastSeenAt: new Date(), pageViews: { increment: pageViews } } });
        });
    }
  }

  await prisma.analyticsEvent.createMany({
    data: events.map((e) => ({
      type: e.type,
      visitorId,
      sessionId: ctx.sessionId?.slice(0, 64) || null,
      providerId: e.providerId ?? null,
      path: e.path?.slice(0, 500) ?? null,
      referrer: ctx.referrer?.slice(0, 500) ?? null,
      device,
      browser,
      os,
      country: geo.country,
      city: geo.city,
      meta: (e.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });
}

// ───────────────────────────── Reporting ─────────────────────────────

export function rangeStart(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

/** Count events by type in a period, optionally for one provider */
export async function countByType(from: Date, to: Date, providerId?: number) {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["type"],
    where: { createdAt: { gte: from, lt: to }, ...(providerId ? { providerId } : {}) },
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.type] = r._count._all;
  return out;
}

/** Daily counts for a chart: [{ date: "2026-09-01", EVENT: n, … }] */
export async function dailySeries(types: EventType[], days: number, providerId?: number) {
  const from = rangeStart(days);
  const rows = await prisma.$queryRaw<{ d: Date | string; t: string; c: bigint | number }[]>(Prisma.sql`
    SELECT DATE(createdAt) AS d, type AS t, COUNT(*) AS c
    FROM AnalyticsEvent
    WHERE createdAt >= ${from}
      AND type IN (${Prisma.join(types)})
      ${providerId ? Prisma.sql`AND providerId = ${providerId}` : Prisma.empty}
    GROUP BY DATE(createdAt), type
  `);
  const map = new Map<string, Record<string, number | string>>();
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, Object.fromEntries([["date", key], ...types.map((t) => [t, 0])]));
  }
  for (const r of rows) {
    const key = (r.d instanceof Date ? r.d : new Date(r.d)).toISOString().slice(0, 10);
    const row = map.get(key);
    if (row) row[r.t] = Number(r.c);
  }
  return [...map.values()];
}

/** Top values of a column (device, browser, city, path…) */
export async function topBy(column: "device" | "browser" | "os" | "country" | "city" | "path", from: Date, opts: { type?: EventType; providerId?: number; limit?: number } = {}) {
  const rows = await prisma.analyticsEvent.groupBy({
    by: [column],
    where: {
      createdAt: { gte: from },
      [column]: { not: null },
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.providerId ? { providerId: opts.providerId } : {}),
    },
    _count: { _all: true },
    orderBy: { _count: { [column]: "desc" } },
    take: opts.limit ?? 10,
  });
  return rows.map((r) => ({ label: String((r as Record<string, unknown>)[column] ?? "Unknown"), count: r._count._all }));
}

/** Percentage change helper for KPI cards */
export function pctChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
