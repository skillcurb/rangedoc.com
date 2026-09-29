/**
 * DASHBOARD → ANALYTICS ( /dashboard/analytics?days=30 )
 * Search appearances, search clicks, profile views, appointment/call/email/
 * website clicks and gallery views. Basic totals for everyone; charts and
 * breakdowns for plans with analytics.
 */
import { Suspense } from "react";
import { CalendarCheck, Eye, Images, Mail, MousePointerClick, Phone, Search, SquareMousePointer } from "lucide-react";
import { getDashboard } from "@/lib/dashboard";
import { countByType, dailySeries, pctChange, rangeStart, topBy } from "@/lib/analytics";
import { PageHeader, Panel, RangeTabs, StatCard, UpgradeNotice } from "@/components/panel/PanelUi";
import { DonutChart, HBarChart, TrendChart } from "@/components/panel/Charts";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata = { title: "Analytics" };

async function Charts({ providerId, days }: { providerId: number; days: number }) {
  const from = rangeStart(days);
  const [series, devices, cities] = await Promise.all([
    dailySeries(["SEARCH_IMPRESSION", "PROFILE_VIEW", "SEARCH_CLICK", "WEBSITE_CLICK", "CALL_CLICK", "APPOINTMENT_CLICK"], days, providerId),
    topBy("device", from, { providerId, type: "PROFILE_VIEW" }),
    topBy("city", from, { providerId, type: "PROFILE_VIEW", limit: 8 }),
  ]);
  return (
    <>
      <Panel title="Activity over time">
        <TrendChart
          data={series}
          area={false}
          series={[
            { key: "PROFILE_VIEW", label: "Profile views" },
            { key: "SEARCH_CLICK", label: "Search clicks" },
            { key: "WEBSITE_CLICK", label: "Website" },
            { key: "CALL_CLICK", label: "Calls" },
            { key: "APPOINTMENT_CLICK", label: "Appointments" },
          ]}
          height={300}
        />
      </Panel>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Visitors by device">{devices.length ? <DonutChart data={devices} /> : <p className="text-sm text-muted">No data yet</p>}</Panel>
        <Panel title="Where your visitors are">{cities.length ? <HBarChart data={cities} /> : <p className="text-sm text-muted">No data yet</p>}</Panel>
      </div>
    </>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30;
  const { provider, features } = await getDashboard();
  const from = rangeStart(days);
  const prevFrom = new Date(from);
  prevFrom.setDate(prevFrom.getDate() - days);
  const [cur, prev] = await Promise.all([countByType(from, new Date(Date.now() + 1000), provider.id), countByType(prevFrom, from, provider.id)]);
  const k = (t: string) => ({ value: cur[t] ?? 0, change: pctChange(cur[t] ?? 0, prev[t] ?? 0) });
  const impressions = cur.SEARCH_IMPRESSION ?? 0;
  const ctr = impressions ? (((cur.SEARCH_CLICK ?? 0) / impressions) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="How patients find and contact you." actions={<RangeTabs days={days} base="/dashboard/analytics" />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Search appearances" {...k("SEARCH_IMPRESSION")} icon={<Search className="size-6" />} />
        <StatCard label="Clicks from search" {...k("SEARCH_CLICK")} icon={<SquareMousePointer className="size-6" />} hint={`${ctr}% click rate`} />
        <StatCard label="Profile views" {...k("PROFILE_VIEW")} icon={<Eye className="size-6" />} />
        <StatCard label="Appointment clicks" {...k("APPOINTMENT_CLICK")} icon={<CalendarCheck className="size-6" />} />
      </div>
      {features.allowAnalytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Call clicks" {...k("CALL_CLICK")} icon={<Phone className="size-6" />} />
            <StatCard label="Email clicks" {...k("EMAIL_CLICK")} icon={<Mail className="size-6" />} />
            <StatCard label="Website clicks" {...k("WEBSITE_CLICK")} icon={<MousePointerClick className="size-6" />} />
            <StatCard label="Gallery views" {...k("GALLERY_VIEW")} icon={<Images className="size-6" />} />
          </div>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <Charts providerId={provider.id} days={days} />
          </Suspense>
        </>
      ) : (
        <UpgradeNotice feature="Detailed analytics" text="See call, email and website clicks, gallery views, visitor devices and locations, with charts over time." />
      )}
    </div>
  );
}
