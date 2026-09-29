/**
 * Small presentational helpers: EmptyState, Pagination, SectionHeading, Breadcrumbs.
 */
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <div className="mb-3 text-navy-300">{icon ?? <Inbox className="size-10" />}</div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Server-rendered pagination using links (?page=n) */
export function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (p: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <Link aria-disabled={page <= 1} href={hrefFor(Math.max(1, page - 1))} className={cn("btn-light btn-sm", page <= 1 && "pointer-events-none opacity-50")}>
        <ChevronLeft className="size-4" /> Prev
      </Link>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-muted">…</span>}
          <Link href={hrefFor(p)} className={cn("btn-sm btn", p === page ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-navy-50")}>
            {p}
          </Link>
        </span>
      ))}
      <Link aria-disabled={page >= totalPages} href={hrefFor(Math.min(totalPages, page + 1))} className={cn("btn-light btn-sm", page >= totalPages && "pointer-events-none opacity-50")}>
        Next <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}

export function SectionHeading({ title, subtitle, action, align = "center" }: { title: string; subtitle?: string | null; action?: React.ReactNode; align?: "center" | "left" }) {
  if (align === "left") {
    return (
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    );
  }
  return (
    <div className="mb-6">
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="section-subtitle">{subtitle}</p>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-navy-900">
              {item.label}
            </Link>
          ) : (
            <span className="text-navy-900">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
