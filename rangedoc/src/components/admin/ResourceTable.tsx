"use client";
/**
 * Generic admin list table: search, filters, quick actions, bulk delete.
 */
import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ExternalLink, Pencil, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import type { ColumnDef, ResourceDef } from "@/lib/admin/resources";
import { deleteMany, deleteRecord, setField } from "@/lib/admin/actions";
import { Stars } from "@/components/ui/Stars";
import { StatusBadge } from "@/components/panel/PanelUi";
import { cn, formatDate, formatMoney } from "@/lib/utils";

type Row = { id: number; __cells: unknown[]; __view?: string | null };

function Cell({ col, value }: { col: ColumnDef; value: unknown }) {
  if (value == null || value === "") return <span className="text-muted">—</span>;
  switch (col.type) {
    case "image":
      return (
        <span className="relative block size-10 overflow-hidden rounded-md bg-surface">
          <Image src={String(value)} alt="" fill sizes="40px" className="object-cover" unoptimized={String(value).endsWith(".svg") || String(value).startsWith("http")} />
        </span>
      );
    case "boolean":
      return value ? <Check className="size-4 text-brand-600" /> : <X className="size-4 text-navy-300" />;
    case "badge":
      return <StatusBadge status={String(value)} />;
    case "money":
      return <>{formatMoney(Number(value))}</>;
    case "date":
      return <span className="whitespace-nowrap">{formatDate(value as string)}</span>;
    case "stars":
      return <Stars value={Number(value)} size={13} />;
    default:
      return <span className="line-clamp-2 max-w-xs">{String(value)}</span>;
  }
}

export function ResourceTable({ resource, rows, total, page, pages }: { resource: ResourceDef; rows: Row[]; total: number; page: number; pages: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useTransition();

  const setParam = (k: string, v: string | null) => {
    const p = new URLSearchParams(params.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.delete("page");
    router.replace(`${pathname}?${p.toString()}`);
  };
  const run = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string } | null>) =>
    start(async () => {
      const res = await fn();
      if (res?.error) toast.error(res.error);
      else toast.success(res?.message ?? "Done");
      setSelected([]);
      router.refresh();
    });
  const editHref = (id: number) => (resource.editPath ? resource.editPath.replace("{id}", String(id)) : `/admin/r/${resource.key}/${id}`);

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", q || null);
          }}
          className="relative"
        >
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${resource.label.toLowerCase()}…`} className="input w-64 py-1.5 pl-8 text-sm" />
        </form>
        {resource.filters?.map((f) => (
          <select key={f.field} value={params.get(f.field) ?? ""} onChange={(e) => setParam(f.field, e.target.value || null)} className="input w-auto py-1.5 text-sm" aria-label={f.label}>
            <option value="">All {f.label.toLowerCase()}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
        {selected.length > 0 && resource.canDelete !== false && (
          <button type="button" disabled={pending} className="btn-danger btn-sm" onClick={() => confirm(`Delete ${selected.length} item(s)?`) && run(() => deleteMany(resource.key, selected))}>
            <Trash2 className="size-4" /> Delete {selected.length}
          </button>
        )}
        <span className="ml-auto text-sm text-muted">{total} total</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" className="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.id) : [])} aria-label="Select all" />
              </th>
              {resource.columns.map((c) => (
                <th key={c.field} className="px-3 py-2.5 font-semibold">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface/60">
                <td className="px-3 py-2">
                  <input type="checkbox" className="checkbox" checked={selected.includes(r.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((x) => x !== r.id))} aria-label="Select row" />
                </td>
                {resource.columns.map((c, i) => (
                  <td key={c.field} className="px-3 py-2">
                    {i === 1 || (i === 0 && c.type !== "image") ? (
                      <Link href={editHref(r.id)} className="font-medium text-navy-900 hover:text-brand-700">
                        <Cell col={c} value={r.__cells[i]} />
                      </Link>
                    ) : (
                      <Cell col={c} value={r.__cells[i]} />
                    )}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1">
                    {resource.quickActions?.map((qa) => (
                      <button
                        key={qa.label}
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => setField(resource.key, r.id, qa.field, qa.value))}
                        className={cn("rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap", qa.tone === "red" ? "text-red-600 hover:bg-red-50" : qa.tone === "green" ? "text-brand-700 hover:bg-brand-50" : "text-navy-700 hover:bg-navy-50")}
                      >
                        {qa.label}
                      </button>
                    ))}
                    {r.__view && (
                      <a href={r.__view} target="_blank" className="rounded-md p-1.5 text-navy-600 hover:bg-navy-50" title="View on site">
                        <ExternalLink className="size-4" />
                      </a>
                    )}
                    <Link href={editHref(r.id)} className="rounded-md p-1.5 text-navy-600 hover:bg-navy-50" title="Edit">
                      <Pencil className="size-4" />
                    </Link>
                    {resource.canDelete !== false && (
                      <button type="button" disabled={pending} onClick={() => confirm("Delete this item permanently?") && run(() => deleteRecord(resource.key, r.id))} className="rounded-md p-1.5 text-red-600 hover:bg-red-50" title="Delete">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={resource.columns.length + 2} className="px-3 py-12 text-center text-muted">
                  Nothing found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line p-3 text-sm">
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn-light btn-sm" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))}>
              Previous
            </button>
            <button type="button" className="btn-light btn-sm" disabled={page >= pages} onClick={() => setParam("page", String(page + 1))}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
