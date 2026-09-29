/**
 * PROVIDER DASHBOARD – OVERVIEW  ( /dashboard?days=30 )
 */
import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, CheckCircle2, Circle, Crown, Eye, Headphones, ImageIcon, Mail, MapPin, MousePointerClick, Phone, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getDashboard, profileChecklist } from "@/lib/dashboard";
import { countByType, dailySeries, pctChange, rangeStart } from "@/lib/analytics";
import { formatDate, initials } from "@/lib/utils";
import { PageHeader, Panel, RangeTabs, StatCard } from "@/components/panel/PanelUi";
import { TrendChart } from "@/components/panel/Charts";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata = { title: "Overview" };

type Props = { searchParams: Promise<{ days?: string }> };

async function Kpis({ providerId, days, percent }: { providerId: number; days: number; percent: number }) {
  const from = rangeStart(days);
  const prevFrom = new Date(from);
  prevFrom.setDate(prevFrom.getDate() - days);
  const [cur, prev, emails, prevEmails] = await Promise.all([
    countByType(from, new Date(Date.now() + 1000), providerId),
    countByType(prevFrom, from, providerId),
    prisma.providerMessage.count({ where: { providerId, createdAt: { gte: from } } }),
    prisma.providerMessage.count({ where: { providerId, createdAt: { gte: prevFrom, lt: from } } }),
  ]);
  const c = (t: string) => cur[t] ?? 0;
  const p = (t: string) => prev[t] ?? 0;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Profile Views" value={c("PROFILE_VIEW")} change={pctChange(c("PROFILE_VIEW"), p("PROFILE_VIEW"))} icon={<Eye className="size-6" />} />
      <StatCard label="Website Clicks" value={c("WEBSITE_CLICK")} change={pctChange(c("WEBSITE_CLICK"), p("WEBSITE_CLICK"))} icon={<MousePointerClick className="size-6" />} />
      <StatCard label="Call Clicks" value={c("CALL_CLICK")} change={pctChange(c("CALL_CLICK"), p("CALL_CLICK"))} icon={<Phone className="size-6" />} />
      <StatCard label="Email Inquiries" value={emails} change={pctChange(emails, prevEmails)} icon={<Mail className="size-6" />} />
      <div className="card flex flex-col items-start p-4">
        <div className="relative size-20">
          <svg viewBox="0 0 36 36" className="size-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e3e8f1" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#178343" strokeWidth="3.5" strokeDasharray={`${percent} 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-lg font-extrabold text-navy-900">{percent}%</span>
        </div>
        <p className="mt-2 text-sm font-medium text-navy-800">Profile Completeness</p>
        <Link href="/dashboard/profile" className="link mt-1 text-sm">
          Complete your profile →
        </Link>
      </div>
    </div>
  );
}

async function ViewsChart({ providerId, days }: { providerId: number; days: number }) {
  const data = await dailySeries(["PROFILE_VIEW"], days, providerId);
  return <TrendChart data={data} series={[{ key: "PROFILE_VIEW", label: "Profile views" }]} />;
}

async function TopConditions({ providerId, days }: { providerId: number; days: number }) {
  // Which conditions people searched when this profile appeared in results
  const rows = await prisma.analyticsEvent.findMany({ where: { providerId, type: "SEARCH_IMPRESSION", createdAt: { gte: rangeStart(days) } }, select: { meta: true }, take: 20000 });
  const counts = new Map<string, number>();
  for (const r of rows) {
    const slug = (r.meta as { condition?: string } | null)?.condition;
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const conds = await prisma.condition.findMany({ where: { slug: { in: [...counts.keys()] } }, select: { slug: true, name: true } });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([slug, n]) => ({ name: conds.find((c) => c.slug === slug)?.name ?? slug, n }));
  const max = top[0]?.n ?? 1;
  if (!top.length) return <p className="text-sm text-muted">No search data yet.</p>;
  return (
    <ol className="space-y-3">
      {top.map((t, i) => (
        <li key={t.name} className="flex items-center gap-3 text-sm">
          <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-xs">{i + 1}</span>
          <span className="w-32 truncate text-navy-900">{t.name}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-navy-50">
            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(t.n / max) * 100}%` }} />
          </span>
          <span className="w-10 text-right font-semibold">{t.n}</span>
        </li>
      ))}
    </ol>
  );
}

async function RecentLeads({ providerId }: { providerId: number }) {
  const [appts, msgs, calls] = await Promise.all([
    prisma.appointmentRequest.findMany({ where: { providerId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.providerMessage.findMany({ where: { providerId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.analyticsEvent.findMany({ where: { providerId, type: "CALL_CLICK" }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);
  const leads = [
    ...appts.map((a) => ({ key: `a${a.id}`, name: `${a.firstName} ${a.lastName}`, at: a.createdAt, kind: "Appointment", color: "bg-brand-50 text-brand-800", text: a.reason || "Requested an appointment", href: "/dashboard/appointments" })),
    ...msgs.map((m) => ({ key: `m${m.id}`, name: m.name, at: m.createdAt, kind: "Email", color: "bg-violet-50 text-violet-700", text: m.subject, href: "/dashboard/messages" })),
    ...calls.map((c) => ({ key: `c${c.id}`, name: c.city ? `Visitor from ${c.city}` : "Website visitor", at: c.createdAt, kind: "Phone Call", color: "bg-blue-50 text-blue-700", text: "Revealed your phone number", href: "/dashboard/analytics" })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);
  if (!leads.length) return <p className="text-sm text-muted">No leads yet. Complete your profile to get more visibility.</p>;
  return (
    <ul className="divide-y divide-line">
      {leads.map((l) => (
        <li key={l.key}>
          <Link href={l.href} className="flex items-center gap-3 py-3 hover:bg-surface">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-50 text-sm font-bold text-navy-700">{initials(l.name)}</span>
            <span className="w-36 shrink-0">
              <span className="block truncate text-sm font-semibold text-navy-900">{l.name}</span>
              <span className="text-xs text-muted">{formatDate(l.at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
            </span>
            <span className={`badge shrink-0 ${l.color}`}>{l.kind}</span>
            <span className="line-clamp-2 flex-1 text-xs text-navy-700">{l.text}</span>
            <ArrowRight className="size-4 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardHome({ searchParams }: Props) {
  const { days: d } = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30;
  const { provider, features } = await getDashboard();
  const check = profileChecklist(provider);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${[provider.prefix, provider.firstName, provider.lastName].filter(Boolean).join(" ")}`}
        subtitle={
          <>
            Here&apos;s what&apos;s happening with your profile.{" "}
            <Link href={`/provider/${provider.slug}`} target="_blank" className="link">
              View public profile ↗
            </Link>
          </>
        }
        actions={<RangeTabs days={days} base="/dashboard" />}
      />

      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>}>
        <Kpis providerId={provider.id} days={days} percent={check.percent} />
      </Suspense>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Profile Views">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <ViewsChart providerId={provider.id} days={days} />
          </Suspense>
        </Panel>
        <Panel title="Top Searched Conditions">
          <Suspense fallback={<Skeleton className="h-64" />}>
            <TopConditions providerId={provider.id} days={days} />
          </Suspense>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Recent Lead Activity" action={<Link href="/dashboard/appointments" className="link text-sm">View all leads →</Link>}>
          <Suspense fallback={<Skeleton className="h-64" />}>
            <RecentLeads providerId={provider.id} />
          </Suspense>
        </Panel>
        <Panel title="Complete Your Profile" action={<span className="text-xs text-muted">{check.percent}% complete</span>}>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-navy-50">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${check.percent}%` }} />
          </div>
          <ul className="space-y-2.5">
            {check.items.map((i) => (
              <li key={i.label} className="flex items-center gap-2.5 text-sm">
                {i.done ? <CheckCircle2 className="size-5 fill-brand-600 text-white" /> : <Circle className="size-5 text-navy-300" />}
                <span className="flex-1 text-navy-800">{i.label}</span>
                {!i.done && (
                  <Link href={i.href} className="link text-xs">
                    Add now →
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <Link href="/dashboard/profile" className="btn-primary mt-5 w-full">
            Finish Setup <ArrowRight className="size-4" />
          </Link>
          <p className="mt-2 text-center text-xs text-muted">A complete profile gets up to 3x more views.</p>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Manage Your Profile">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Edit Profile", href: "/dashboard/profile", Icon: UserRound },
              { label: "Manage Locations", href: "/dashboard/locations", Icon: MapPin },
              { label: "Update Conditions", href: "/dashboard/profile#services", Icon: Stethoscope },
              { label: "Insurance", href: "/dashboard/profile#services", Icon: ShieldCheck },
              { label: "Photos & Videos", href: "/dashboard/media", Icon: ImageIcon },
              { label: "Availability", href: "/dashboard/availability", Icon: CalendarDays },
            ].map(({ label, href, Icon }) => (
              <Link key={label} href={href} className="flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center text-sm font-medium text-navy-800 hover:border-brand-400 hover:bg-brand-50/40">
                <Icon className="size-6 text-brand-600" /> {label}
              </Link>
            ))}
          </div>
        </Panel>
        {!features.isPaid ? (
          <section className="card relative overflow-hidden bg-gradient-to-br from-brand-50 to-white p-6">
            <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-brand-800 uppercase">
              <Crown className="size-5 text-amber-500" /> Pro &amp; Featured
            </p>
            <h2 className="mt-2 text-2xl font-extrabold">Get More Visibility. See More Patients.</h2>
            <p className="mt-2 text-sm text-navy-700">Upgrade to appear higher in search results, showcase patient reviews, add a video, unlimited photos and more.</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {["Higher search rankings", "Featured provider badge", "More profile views and patient leads", "Detailed analytics"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-navy-800">
                  <Check className="size-4 text-brand-600" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/dashboard/billing" className="btn-primary mt-5">
              View Plans <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : (
          <Panel title={`You're on ${features.planName}`}>
            <p className="text-sm text-navy-700">
              Your plan {provider.planExpiresAt ? `renews / expires on ${formatDate(provider.planExpiresAt)}` : "does not expire"}. Thank you for being a member!
            </p>
            <Link href="/dashboard/billing" className="btn-light mt-4">
              Manage billing
            </Link>
          </Panel>
        )}
      </div>

      <section className="card flex flex-wrap items-center gap-4 p-5">
        <Headphones className="size-9 text-brand-600" />
        <div className="flex-1">
          <h2 className="font-bold">Need help?</h2>
          <p className="text-sm text-muted">Our team is here for you.</p>
        </div>
        <Link href="/help-center" target="_blank" className="btn-outline">
          Visit Help Center
        </Link>
        <Link href="/contact" target="_blank" className="btn-light">
          Contact Support
        </Link>
      </section>
    </div>
  );
}

