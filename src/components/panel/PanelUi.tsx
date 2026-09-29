/**
 * Small building blocks shared by admin + provider dashboard pages.
 */
import Link from "next/link";
import { ArrowDown, ArrowUp, Lock } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, change, icon, hint }: { label: string; value: number | string; change?: number | null; icon?: React.ReactNode; hint?: string }) {
  return (
    <div className="card card-hover relative overflow-hidden p-4">
      <div className="absolute -top-8 -right-8 size-24 rounded-full bg-gradient-to-br from-brand-100/70 to-transparent" aria-hidden />
      <div className="icon-bubble size-11">{icon}</div>
      <p className="mt-2 text-sm font-medium text-navy-800">{label}</p>
      <p className="font-display text-3xl font-extrabold text-navy-900">{typeof value === "number" ? formatNumber(value) : value}</p>
      {change != null && (
        <p className={cn("mt-1 flex items-center gap-1 text-sm font-semibold", change >= 0 ? "text-brand-700" : "text-red-600")}>
          {change >= 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />} {Math.abs(change)}%
          <span className="font-normal text-muted">{hint ?? "vs. previous period"}</span>
        </p>
      )}
    </div>
  );
}

export function Panel({ title, action, children, className }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Shown in place of a feature the current plan doesn't include */
export function UpgradeNotice({ feature, text }: { feature: string; text?: string }) {
  return (
    <div className="card animate-pop-in flex flex-col items-center gap-3 bg-gradient-to-br from-amber-50 via-white to-brand-50 p-8 text-center">
      <Lock className="size-10 text-amber-500" />
      <h2 className="text-xl font-bold">{feature} is a Pro feature</h2>
      <p className="max-w-md text-sm text-navy-700">{text ?? "Upgrade your plan to unlock this feature and get more visibility, more leads and priority placement in search results."}</p>
      <Link href="/dashboard/billing" className="btn-primary">
        View plans
      </Link>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    NEW: "bg-blue-50 text-blue-700",
    PENDING: "bg-amber-50 text-amber-800",
    CONFIRMED: "bg-brand-50 text-brand-800",
    APPROVED: "bg-brand-50 text-brand-800",
    PAID: "bg-brand-50 text-brand-800",
    COMPLETED: "bg-navy-50 text-navy-800",
    SHIPPED: "bg-indigo-50 text-indigo-700",
    PROCESSING: "bg-sky-50 text-sky-700",
    CANCELLED: "bg-red-50 text-red-700",
    REJECTED: "bg-red-50 text-red-700",
    FAILED: "bg-red-50 text-red-700",
    REFUNDED: "bg-gray-100 text-gray-700",
    CLAIMED: "bg-brand-50 text-brand-800",
    UNCLAIMED: "bg-gray-100 text-gray-700",
    ACTIVE: "bg-brand-50 text-brand-800",
    INACTIVE: "bg-gray-100 text-gray-700",
  };
  return <span className={cn("badge", map[status] ?? "bg-gray-100 text-gray-700")}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

/** Period selector links (?days=7|30|90) */
export function RangeTabs({ days, base }: { days: number; base: string }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-0.5 text-sm">
      {[7, 30, 90, 365].map((d) => (
        <Link key={d} href={`${base}?days=${d}`} className={cn("rounded-md px-3 py-1.5", d === days ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-surface")}>
          {d === 365 ? "12 mo" : `${d} days`}
        </Link>
      ))}
    </div>
  );
}
