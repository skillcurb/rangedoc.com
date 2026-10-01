/**
 * ADMIN ANALYTICS ( /admin/analytics?days=30 )
 * Visitors, locations, devices, browsers, top pages, top profiles,
 * repeat visits, and every provider interaction (profile photo views,
 * appointment requests, calls, emails, website clicks).
 */
import { Suspense } from "react";
import Link from "next/link";
import { db, t, and, gt, gte, inArray, isNotNull, desc, avg, count } from "@/lib/db";
import { EVENT_LABEL, countByType, dailySeries, rangeStart, topBy } from "@/lib/analytics";
import { formatDate, formatNumber, providerName } from "@/lib/utils";
import { PageHeader, Panel, RangeTabs } from "@/components/panel/PanelUi";
import { DonutChart, HBarChart, TrendChart } from "@/components/panel/Charts";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata = { title: "Analytics" };

const INTERACTIONS = ["PROFILE_VIEW", "SEARCH_CLICK", "APPOINTMENT_CLICK", "APPOINTMENT_SUBMIT", "CALL_CLICK", "EMAIL_CLICK", "EMAIL_SUBMIT", "WEBSITE_CLICK", "GALLERY_VIEW", "PHOTO_VIEW", "SHARE_CLICK", "SAVE_CLICK"] as const;

async function Overview({ days }: { days: number }) {
  const from = rangeStart(days);
  const [counts, series, newVisitors, returning, avgVisits] = await Promise.all([
    countByType(from, new Date(Date.now() + 1000)),
    dailySeries(["PAGE_VIEW", "SEARCH", "PROFILE_VIEW"], days),
    db.$count(t.visitors, gte(t.visitors.firstSeenAt, from)),
    db.$count(t.visitors, and(gte(t.visitors.lastSeenAt, from), gt(t.visitors.visitCount, 1))),
    // AVG() comes back as a string (or null when there are no visitors)
    db
      .select({ visitCount: avg(t.visitors.visitCount), pageViews: avg(t.visitors.pageViews) })
      .from(t.visitors)
      .where(gte(t.visitors.lastSeenAt, from)),
  ]);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["New visitors", newVisitors],
          ["Returning visitors", returning],
          ["Avg. visits / visitor", Number(avgVisits[0]?.visitCount ?? 0).toFixed(1)],
          ["Avg. pages / visitor", Number(avgVisits[0]?.pageViews ?? 0).toFixed(1)],
        ].map(([l, v]) => (
          <div key={l as string} className="card p-4">
            <p className="text-sm text-muted">{l}</p>
            <p className="font-display text-3xl font-extrabold text-navy-900">{typeof v === "number" ? formatNumber(v) : v}</p>
          </div>
        ))}
      </div>
      <Panel title="Traffic over time">
        <TrendChart data={series} area={false} series={[{ key: "PAGE_VIEW", label: "Page views" }, { key: "SEARCH", label: "Searches" }, { key: "PROFILE_VIEW", label: "Profile views" }]} height={300} />
      </Panel>
      <Panel title="All interactions">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {INTERACTIONS.map((t) => (
            <div key={t} className="rounded-lg bg-surface p-3">
              <p className="text-xs text-muted">{EVENT_LABEL[t]}</p>
              <p className="text-xl font-bold text-navy-900">{formatNumber(counts[t] ?? 0)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

async function Breakdown({ days }: { days: number }) {
  const from = rangeStart(days);
  const [devices, browsers, os, cities, countries, pages] = await Promise.all([
    topBy("device", from, { type: "PAGE_VIEW" }),
    topBy("browser", from, { type: "PAGE_VIEW", limit: 6 }),
    topBy("os", from, { type: "PAGE_VIEW", limit: 6 }),
    topBy("city", from, { limit: 10 }),
    topBy("country", from, { limit: 10 }),
    topBy("path", from, { type: "PAGE_VIEW", limit: 12 }),
  ]);
  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Devices">{devices.length ? <DonutChart data={devices} /> : <Empty />}</Panel>
        <Panel title="Browsers">{browsers.length ? <DonutChart data={browsers} /> : <Empty />}</Panel>
        <Panel title="Operating systems">{os.length ? <DonutChart data={os} /> : <Empty />}</Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Visitor locations (city)">{cities.length ? <HBarChart data={cities} height={300} /> : <Empty />}</Panel>
        <Panel title="Visitor locations (country)">{countries.length ? <HBarChart data={countries} height={300} /> : <Empty />}</Panel>
      </div>
      <Panel title="Top pages">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {pages.map((p) => (
              <tr key={p.label}>
                <td className="py-2 font-mono text-xs"><a href={p.label} target="_blank" className="hover:text-brand-700">{p.label}</a></td>
                <td className="py-2 text-right font-semibold">{formatNumber(p.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

async function ProviderTable({ days }: { days: number }) {
  const from = rangeStart(days);
  // Number of events per (provider, event type) – GROUP BY providerId, type
  const rows = await db
    .select({ providerId: t.analyticsEvents.providerId, type: t.analyticsEvents.type, n: count() })
    .from(t.analyticsEvents)
    .where(and(gte(t.analyticsEvents.createdAt, from), isNotNull(t.analyticsEvents.providerId), inArray(t.analyticsEvents.type, [...INTERACTIONS])))
    .groupBy(t.analyticsEvents.providerId, t.analyticsEvents.type);
  const byProvider = new Map<number, Record<string, number>>();
  for (const r of rows) {
    const m = byProvider.get(r.providerId!) ?? {};
    m[r.type] = Number(r.n);
    byProvider.set(r.providerId!, m);
  }
  const top = [...byProvider.entries()].sort((a, b) => (b[1].PROFILE_VIEW ?? 0) - (a[1].PROFILE_VIEW ?? 0)).slice(0, 25);
  const providers = top.length
    ? await db
        .select({ id: t.providers.id, slug: t.providers.slug, prefix: t.providers.prefix, firstName: t.providers.firstName, lastName: t.providers.lastName, credentials: t.providers.credentials })
        .from(t.providers)
        .where(inArray(t.providers.id, top.map(([id]) => id)))
    : [];
  const cols = ["PROFILE_VIEW", "SEARCH_CLICK", "PHOTO_VIEW", "GALLERY_VIEW", "APPOINTMENT_SUBMIT", "CALL_CLICK", "EMAIL_SUBMIT", "WEBSITE_CLICK"];
  return (
    <Panel title="Top provider profiles">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted uppercase">
            <tr>
              <th className="py-2">Provider</th>
              {cols.map((c) => (
                <th key={c} className="px-2 py-2 text-right">{EVENT_LABEL[c]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {top.map(([id, m]) => {
              const p = providers.find((x) => x.id === id);
              return (
                <tr key={id}>
                  <td className="py-2">{p ? <Link href={`/admin/r/providers/${id}`} className="font-medium text-navy-900 hover:text-brand-700">{providerName(p)}</Link> : `#${id}`}</td>
                  {cols.map((c) => (
                    <td key={c} className="px-2 py-2 text-right">{m[c] ?? 0}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

async function RecentVisitors() {
  const visitors = await db.query.visitors.findMany({ orderBy: [desc(t.visitors.lastSeenAt)], limit: 15 });
  return (
    <Panel title="Recent visitors">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted uppercase">
            <tr><th className="py-2">Last seen</th><th>Location</th><th>Device</th><th>Browser / OS</th><th className="text-right">Visits</th><th className="text-right">Pages</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visitors.map((v) => (
              <tr key={v.id}>
                <td className="py-2">{formatDate(v.lastSeenAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                <td>{[v.city, v.region, v.country].filter(Boolean).join(", ") || "—"}</td>
                <td>{v.device ?? "—"}</td>
                <td>{[v.browser, v.os].filter(Boolean).join(" / ") || "—"}</td>
                <td className="text-right">{v.visitCount}</td>
                <td className="text-right">{v.pageViews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Empty() {
  return <p className="text-sm text-muted">No data yet</p>;
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30;
  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Anonymous visitor analytics collected by the site (no third-party trackers)." actions={<RangeTabs days={days} base="/admin/analytics" />} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Overview days={days} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Breakdown days={days} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProviderTable days={days} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <RecentVisitors />
      </Suspense>
    </div>
  );
}
