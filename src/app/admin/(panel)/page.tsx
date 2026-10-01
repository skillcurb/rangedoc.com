/**
 * ADMIN DASHBOARD ( /admin?days=30 )
 * Site-wide KPIs, traffic chart, revenue, recent activity and to-dos.
 */
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck, DollarSign, Eye, Mail, MousePointerClick, Search, Stethoscope, UserCheck, Users } from "lucide-react";
import { db, t, eq, and, gte, lt, inArray, desc, sum } from "@/lib/db";
import { countByType, dailySeries, pctChange, rangeStart, topBy } from "@/lib/analytics";
import { formatDate, formatMoney, providerName } from "@/lib/utils";
import { PageHeader, Panel, RangeTabs, StatCard, StatusBadge } from "@/components/panel/PanelUi";
import { DonutChart, TrendChart } from "@/components/panel/Charts";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata = { title: "Dashboard" };

async function Kpis({ days }: { days: number }) {
  const from = rangeStart(days);
  const prevFrom = new Date(from);
  prevFrom.setDate(prevFrom.getDate() - days);
  const [cur, prev, visitors, prevVisitors, planRev, orderRev, providers, claimed] = await Promise.all([
    countByType(from, new Date(Date.now() + 1000)),
    countByType(prevFrom, from),
    db.$count(t.visitors, gte(t.visitors.lastSeenAt, from)),
    db.$count(t.visitors, and(gte(t.visitors.lastSeenAt, prevFrom), lt(t.visitors.lastSeenAt, from))),
    // SUM() comes back as a string (or null when no rows match)
    db
      .select({ total: sum(t.planOrders.amountCents) })
      .from(t.planOrders)
      .where(and(eq(t.planOrders.status, "PAID"), gte(t.planOrders.paidAt, from))),
    db
      .select({ total: sum(t.orders.totalCents) })
      .from(t.orders)
      .where(and(inArray(t.orders.status, ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"]), gte(t.orders.createdAt, from))),
    db.$count(t.providers),
    db.$count(t.providers, eq(t.providers.claimStatus, "CLAIMED")),
  ]);
  const revenue = Number(planRev[0]?.total ?? 0) + Number(orderRev[0]?.total ?? 0);
  const c = (t: string) => cur[t] ?? 0;
  const p = (t: string) => prev[t] ?? 0;
  const leads = c("APPOINTMENT_SUBMIT") + c("EMAIL_SUBMIT") + c("CALL_CLICK");
  const prevLeads = p("APPOINTMENT_SUBMIT") + p("EMAIL_SUBMIT") + p("CALL_CLICK");
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Visitors" value={visitors} change={pctChange(visitors, prevVisitors)} icon={<Users className="size-6" />} />
      <StatCard label="Page views" value={c("PAGE_VIEW")} change={pctChange(c("PAGE_VIEW"), p("PAGE_VIEW"))} icon={<Eye className="size-6" />} />
      <StatCard label="Searches" value={c("SEARCH")} change={pctChange(c("SEARCH"), p("SEARCH"))} icon={<Search className="size-6" />} />
      <StatCard label="Profile views" value={c("PROFILE_VIEW")} change={pctChange(c("PROFILE_VIEW"), p("PROFILE_VIEW"))} icon={<Stethoscope className="size-6" />} />
      <StatCard label="Leads (calls, emails, appointments)" value={leads} change={pctChange(leads, prevLeads)} icon={<CalendarCheck className="size-6" />} />
      <StatCard label="Website clicks" value={c("WEBSITE_CLICK")} change={pctChange(c("WEBSITE_CLICK"), p("WEBSITE_CLICK"))} icon={<MousePointerClick className="size-6" />} />
      <StatCard label="Revenue (plans + products)" value={formatMoney(revenue)} icon={<DollarSign className="size-6" />} />
      <StatCard label="Claimed profiles" value={`${claimed} / ${providers}`} icon={<UserCheck className="size-6" />} />
    </div>
  );
}

async function Traffic({ days }: { days: number }) {
  const [series, devices] = await Promise.all([dailySeries(["PAGE_VIEW", "PROFILE_VIEW", "SEARCH_CLICK"], days), topBy("device", rangeStart(days), { type: "PAGE_VIEW" })]);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <Panel title="Traffic">
        <TrendChart data={series} area={false} series={[{ key: "PAGE_VIEW", label: "Page views" }, { key: "PROFILE_VIEW", label: "Profile views" }, { key: "SEARCH_CLICK", label: "Search clicks" }]} />
      </Panel>
      <Panel title="Devices">{devices.length ? <DonutChart data={devices} height={260} /> : <p className="text-sm text-muted">No data yet</p>}</Panel>
    </div>
  );
}

async function Recent() {
  const [claims, appts, orders, planOrders, reviews] = await Promise.all([
    db.query.providers.findMany({ where: eq(t.providers.claimStatus, "PENDING"), limit: 5, orderBy: [desc(t.providers.updatedAt)] }),
    db.query.appointmentRequests.findMany({ limit: 6, orderBy: [desc(t.appointmentRequests.createdAt)], with: { provider: true } }),
    db.query.orders.findMany({ limit: 5, orderBy: [desc(t.orders.createdAt)] }),
    db.query.planOrders.findMany({ limit: 5, orderBy: [desc(t.planOrders.createdAt)], with: { plan: true } }),
    db.$count(t.reviews, eq(t.reviews.status, "PENDING")),
  ]);
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Panel title="Needs attention">
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between"><Link href="/admin/claims" className="link">Profile claims to verify</Link><b>{claims.length}</b></li>
          <li className="flex justify-between"><Link href="/admin/r/reviews?status=PENDING" className="link">Reviews to moderate</Link><b>{reviews}</b></li>
          <li className="flex justify-between"><Link href="/admin/r/plan-orders?status=PENDING" className="link">Unpaid plan orders</Link><b>{planOrders.filter((o) => o.status === "PENDING").length}</b></li>
        </ul>
        {claims.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
            {claims.map((c) => (
              <li key={c.id} className="py-2">
                {providerName(c)}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Latest appointment requests" action={<Link href="/admin/r/appointments" className="link text-sm">All →</Link>}>
        <ul className="divide-y divide-line text-sm">
          {appts.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <b className="text-navy-900">{a.firstName} {a.lastName}</b>
                <span className="block text-xs text-muted">→ {providerName(a.provider)}</span>
              </span>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Latest orders" action={<Link href="/admin/r/orders" className="link text-sm">All →</Link>}>
        <ul className="divide-y divide-line text-sm">
          {planOrders.map((o) => (
            <li key={`p${o.id}`} className="flex items-center justify-between py-2">
              <span>
                <b className="text-navy-900">{o.plan.name}</b>
                <span className="block text-xs text-muted">{o.billingName} · {formatDate(o.createdAt)}</span>
              </span>
              <span className="text-right">{formatMoney(o.amountCents)}<br /><StatusBadge status={o.status} /></span>
            </li>
          ))}
          {orders.map((o) => (
            <li key={`o${o.id}`} className="flex items-center justify-between py-2">
              <span>
                <Link href={`/admin/orders/${o.id}`} className="font-bold text-navy-900 hover:text-brand-700">{o.orderNumber}</Link>
                <span className="block text-xs text-muted">{o.customerName} · {formatDate(o.createdAt)}</span>
              </span>
              <span className="text-right">{formatMoney(o.totalCents)}<br /><StatusBadge status={o.status} /></span>
            </li>
          ))}
          {!orders.length && !planOrders.length && <li className="py-2 text-muted">No orders yet</li>}
        </ul>
      </Panel>
    </div>
  );
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={<Link href="/admin/analytics" className="link">Open detailed analytics <ArrowRight className="inline size-3.5" /></Link>}
        actions={<RangeTabs days={days} base="/admin" />}
      />
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>}>
        <Kpis days={days} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-80" />}>
        <Traffic days={days} />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <Recent />
      </Suspense>
      <p className="text-xs text-muted"><Mail className="inline size-3.5" /> Tip: set an admin notification email in Settings → Email to receive new leads, claims and orders.</p>
    </div>
  );
}
