/**
 * Analytics – recording and reporting.
 * ------------------------------------------------------------------
 * Every tracked interaction becomes a row in `analytics_events` and updates
 * the anonymous `visitors` row (device, browser, location, visit count).
 *
 * Visitor location comes from (first available):
 *   1. CDN geo headers (Vercel `x-vercel-ip-*`, Cloudflare `cf-ip*`)
 *   2. The visitor's chosen / detected location sent by the browser
 */
import "server-only";
import { UAParser } from "ua-parser-js";
import { db, t, eq, and, gte, lt, isNotNull, desc, sql, count, isDuplicateKey } from "@/lib/db";
import type { EventType } from "@/db/schema";

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
    const existing = await db.query.visitors.findFirst({ where: eq(t.visitors.id, visitorId) });
    if (existing) {
      const newSession = !!ctx.sessionId && ctx.sessionId !== existing.lastSessionId;
      await db
        .update(t.visitors)
        .set({
          lastSeenAt: new Date(),
          // Increment in SQL so parallel requests don't overwrite each other
          pageViews: sql`${t.visitors.pageViews} + ${pageViews}`,
          ...(newSession ? { visitCount: sql`${t.visitors.visitCount} + 1`, lastSessionId: ctx.sessionId } : {}),
          device,
          browser,
          os,
          ...(geo.city ? { city: geo.city, region: geo.region, country: geo.country, lat: geo.lat, lng: geo.lng } : {}),
        })
        .where(eq(t.visitors.id, visitorId));
    } else {
      // Two requests from a brand-new visitor can arrive at the same time,
      // so ignore "already exists" (duplicate key) and just bump the counters instead.
      try {
        await db.insert(t.visitors).values({
          id: visitorId,
          pageViews,
          lastSessionId: ctx.sessionId ?? null,
          device,
          browser,
          os,
          ...geo,
          referrer: ctx.referrer?.slice(0, 500) || null,
        });
      } catch (e) {
        if (!isDuplicateKey(e)) throw e;
        await db
          .update(t.visitors)
          .set({ lastSeenAt: new Date(), pageViews: sql`${t.visitors.pageViews} + ${pageViews}` })
          .where(eq(t.visitors.id, visitorId));
      }
    }
  }

  await db.insert(t.analyticsEvents).values(
    events.map((e) => ({
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
      meta: e.meta ?? null,
    })),
  );
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
  const e = t.analyticsEvents;
  const rows = await db
    .select({ type: e.type, n: count() })
    .from(e)
    .where(and(gte(e.createdAt, from), lt(e.createdAt, to), providerId ? eq(e.providerId, providerId) : undefined))
    .groupBy(e.type);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.type] = Number(r.n);
  return out;
}

/** Daily counts for a chart: [{ date: "2026-09-01", EVENT: n, … }] */
export async function dailySeries(types: EventType[], days: number, providerId?: number) {
  const from = rangeStart(days);
  type DayRow = { d: Date | string; t: string; c: bigint | number | string };
  let rows: DayRow[] = [];
  // "IN ()" would be invalid SQL, so only query when there are types to count
  if (types.length) {
    const e = t.analyticsEvents;
    // MySQL: group events per calendar day and type (enum columns compare as text).
    // Table/column references render as `analytics_events`.`created_at` etc.
    const result = await db.execute(sql`
      SELECT DATE(${e.createdAt}) AS d, ${e.type} AS t, COUNT(*) AS c
      FROM ${e}
      WHERE ${e.createdAt} >= ${from}
        AND ${e.type} IN (${sql.join(
          types.map((v) => sql`${v}`),
          sql`, `,
        )})
        ${providerId ? sql`AND ${e.providerId} = ${providerId}` : sql``}
      GROUP BY DATE(${e.createdAt}), ${e.type}
    `);
    // mysql2 returns [rows, fields]
    rows = (result as unknown as [DayRow[], unknown])[0];
  }
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
  const e = t.analyticsEvents;
  const col = e[column];
  const n = count();
  const rows = await db
    .select({ value: col, n })
    .from(e)
    .where(
      and(
        gte(e.createdAt, from),
        isNotNull(col),
        opts.type ? eq(e.type, opts.type) : undefined,
        opts.providerId ? eq(e.providerId, opts.providerId) : undefined,
      ),
    )
    .groupBy(col)
    .orderBy(desc(n))
    .limit(opts.limit ?? 10);
  return rows.map((r) => ({ label: String(r.value ?? "Unknown"), count: Number(r.n) }));
}

/** Percentage change helper for KPI cards */
export function pctChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
