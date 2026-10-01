/**
 * Generic admin data access for the resource definitions.
 * (Prisma delegates are accessed by name, so they are typed loosely here.)
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import type { FieldDef, ResourceDef } from "@/lib/admin/resources";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Delegate = {
  findMany: (args: any) => Promise<any[]>;
  findUnique: (args: any) => Promise<any>;
  count: (args: any) => Promise<number>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  deleteMany: (args: any) => Promise<any>;
};

export function delegate(model: string): Delegate {
  const d = (prisma as unknown as Record<string, Delegate>)[model];
  if (!d) throw new Error(`Unknown model ${model}`);
  return d;
}

export const PAGE_SIZE = 25;

export async function listRecords(res: ResourceDef, opts: { q?: string; page?: number; filters?: Record<string, string> }) {
  const where: Record<string, unknown> = {};
  // MySQL default collation (utf8mb4_unicode_ci) is case-insensitive, so plain "contains" works
  if (opts.q) where.OR = res.searchFields.map((f) => ({ [f]: { contains: opts.q } }));
  for (const f of res.filters ?? []) {
    const v = opts.filters?.[f.field];
    if (v) where[f.field] = v;
  }
  const page = Math.max(1, opts.page ?? 1);
  const d = delegate(res.model);
  const [total, rows] = await Promise.all([
    d.count({ where }),
    d.findMany({ where, orderBy: res.orderBy, include: res.include, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  return { total, rows, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Load a record with the ids of its many-to-many relations */
export async function getRecord(res: ResourceDef, id: number) {
  const include: Record<string, unknown> = {};
  for (const f of res.fields) if (f.type === "relationMany") include[f.name] = { select: { id: true } };
  return delegate(res.model).findUnique({ where: { id }, include: Object.keys(include).length ? include : undefined });
}

/** Options for relation dropdowns / checkbox lists */
export async function relationOptions(fields: FieldDef[]) {
  const out: Record<string, { value: number; label: string }[]> = {};
  for (const f of fields) {
    if ((f.type !== "relation" && f.type !== "relationMany") || !f.relation) continue;
    const labelParts = f.relation.labelField.split("+");
    const rows = await delegate(f.relation.model).findMany({
      select: { id: true, ...Object.fromEntries(labelParts.map((p) => [p, true])) },
      orderBy: f.relation.orderBy ? { [f.relation.orderBy]: "asc" } : { id: "asc" },
      take: 2000,
    });
    out[f.name] = rows.map((r) => ({ value: r.id as number, label: labelParts.map((p) => r[p]).filter(Boolean).join(" ") }));
  }
  return out;
}

/** Read "a.b.c" (and "a.b+a.c" joined with a space) from a row */
export function readPath(row: Record<string, unknown>, path: string): unknown {
  if (path.includes("+")) return path.split("+").map((p) => readPath(row, p)).filter(Boolean).join(" ");
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), row);
}
