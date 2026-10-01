/**
 * Generic admin data access for the resource definitions (Drizzle).
 * ------------------------------------------------------------------
 * The admin CRUD pages work for every table listed in
 * src/lib/admin/resources.ts. A resource names its table ("providers",
 * "blogPosts"…) and this file turns that name into Drizzle queries:
 *
 *   listRecords   – search + filters + paging (+ relation columns and counts)
 *   getRecord     – one row, plus the ids of its many-to-many links
 *   findRow/…     – small helpers used by the generic server actions
 *   setLinks      – replace many-to-many links (provider ↔ conditions…)
 *
 * Tables are accessed by name, so the typing here is intentionally loose.
 */
import "server-only";
import { and, asc, count, desc, eq, getTableColumns, inArray, like, or, type SQL } from "drizzle-orm";
import type { MySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";
import { db } from "@/lib/db";
import * as t from "@/db/schema";
import type { FieldDef, ResourceDef } from "@/lib/admin/resources";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const PAGE_SIZE = 25;

/** Look up a table from src/db/schema.ts by its export name */
export function tableOf(model: string): MySqlTable {
  const table = (t as unknown as Record<string, MySqlTable>)[model];
  if (!table) throw new Error(`Unknown table ${model}`);
  return table;
}

/** Column object of a table by its camelCase property name */
export function columnOf(model: string, name: string): MySqlColumn {
  const col = (getTableColumns(tableOf(model)) as Record<string, MySqlColumn>)[name];
  if (!col) throw new Error(`Unknown column ${model}.${name}`);
  return col;
}

/**
 * Many-to-many fields (type "relationMany") and the join table behind them.
 * self  = join column pointing at the edited row
 * other = join column pointing at the linked row
 */
export const LINKS: Record<string, Record<string, { join: MySqlTable; self: MySqlColumn; other: MySqlColumn }>> = {
  providers: {
    conditions: { join: t.providerConditions, self: t.providerConditions.providerId, other: t.providerConditions.conditionId },
    specialties: { join: t.providerSpecialties, self: t.providerSpecialties.providerId, other: t.providerSpecialties.specialtyId },
    insurances: { join: t.providerInsurances, self: t.providerInsurances.providerId, other: t.providerInsurances.insuranceId },
  },
  blogPosts: {
    tags: { join: t.blogPostTags, self: t.blogPostTags.postId, other: t.blogPostTags.tagId },
  },
};

/** "_count.x" list columns: which column of which table points back at the row */
const COUNTS: Record<string, Record<string, { table: MySqlTable; fk: MySqlColumn }>> = {
  cities: { providers: { table: t.providers, fk: t.providers.cityId } },
  conditions: { providers: { table: t.providerConditions, fk: t.providerConditions.conditionId } },
  productCategories: { products: { table: t.products, fk: t.products.categoryId } },
  orders: { items: { table: t.orderItems, fk: t.orderItems.orderId } },
  blogCategories: { posts: { table: t.blogPosts, fk: t.blogPosts.categoryId } },
  blogTags: { posts: { table: t.blogPostTags, fk: t.blogPostTags.tagId } },
};

/** Relational query builder (db.query.<model>) for a table name */
function queryOf(model: string) {
  const q = (db.query as unknown as Record<string, { findMany: (a: any) => Promise<any[]>; findFirst: (a: any) => Promise<any> }>)[model];
  if (!q) throw new Error(`Unknown table ${model}`);
  return q;
}

/** WHERE clause for the list page: text search (OR over search fields) + dropdown filters */
function listWhere(res: ResourceDef, opts: { q?: string; filters?: Record<string, string> }): SQL | undefined {
  const parts: (SQL | undefined)[] = [];
  // MySQL's default collation (utf8mb4_unicode_ci) is case-insensitive, so LIKE ignores case
  if (opts.q) parts.push(or(...res.searchFields.map((f) => like(columnOf(res.model, f), `%${opts.q}%`))));
  for (const f of res.filters ?? []) {
    const v = opts.filters?.[f.field];
    if (v) parts.push(eq(columnOf(res.model, f.field), v));
  }
  return and(...parts);
}

/** [{ createdAt: "desc" }] → [desc(table.createdAt)] */
function orderOf(model: string, orderBy: Record<string, "asc" | "desc">[]) {
  return orderBy.flatMap((o) => Object.entries(o).map(([k, dir]) => (dir === "desc" ? desc(columnOf(model, k)) : asc(columnOf(model, k)))));
}

export async function listRecords(res: ResourceDef, opts: { q?: string; page?: number; filters?: Record<string, string> }) {
  const where = listWhere(res, opts);
  const page = Math.max(1, opts.page ?? 1);
  const [total, rows] = await Promise.all([
    db.$count(tableOf(res.model), where),
    queryOf(res.model).findMany({
      where,
      orderBy: orderOf(res.model, res.orderBy),
      with: res.with,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
  ]);

  // "_count.x" columns: one grouped COUNT query per counted relation
  if (res.counts?.length && rows.length) {
    const ids = rows.map((r) => r.id as number);
    for (const r of rows) r._count = {};
    for (const name of res.counts) {
      const c = COUNTS[res.model]?.[name];
      if (!c) continue;
      const counts = await db.select({ id: c.fk, n: count() }).from(c.table).where(inArray(c.fk, ids)).groupBy(c.fk);
      const map = new Map(counts.map((x) => [Number(x.id), Number(x.n)]));
      for (const r of rows) r._count[name] = map.get(r.id) ?? 0;
    }
  }
  return { total, rows, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** One row by id (or undefined) */
export async function findRow(model: string, id: number): Promise<any> {
  const [row] = await db.select().from(tableOf(model)).where(eq(columnOf(model, "id"), id)).limit(1);
  return row;
}

/** Several rows by id */
export async function findRows(model: string, ids: number[]): Promise<any[]> {
  if (!ids.length) return [];
  return db.select().from(tableOf(model)).where(inArray(columnOf(model, "id"), ids));
}

/** First row where `column = value` (used for unique slug checks) */
export async function findBy(model: string, column: string, value: unknown): Promise<any> {
  const [row] = await db.select().from(tableOf(model)).where(eq(columnOf(model, column), value)).limit(1);
  return row;
}

/** Insert a row and return its new id */
export async function insertRow(model: string, data: Record<string, unknown>): Promise<number> {
  const [row] = (await db.insert(tableOf(model)).values(data as any).$returningId()) as { id: number }[];
  return Number(row.id);
}

/** Update columns of one row (no-op when nothing to change) */
export async function updateRow(model: string, id: number, data: Record<string, unknown>) {
  if (Object.keys(data).length) await db.update(tableOf(model)).set(data as any).where(eq(columnOf(model, "id"), id));
}

/** Delete rows by id */
export async function deleteRows(model: string, ids: number[]) {
  if (ids.length) await db.delete(tableOf(model)).where(inArray(columnOf(model, "id"), ids));
}

/** Replace the many-to-many links of a row (e.g. a provider's conditions) */
export async function setLinks(model: string, field: string, id: number, linkedIds: number[]) {
  const link = LINKS[model]?.[field];
  if (!link) throw new Error(`No many-to-many field ${model}.${field}`);
  const selfKey = propertyName(link.join, link.self);
  const otherKey = propertyName(link.join, link.other);
  await db.transaction(async (tx) => {
    await tx.delete(link.join).where(eq(link.self, id));
    const unique = [...new Set(linkedIds)];
    if (unique.length) await tx.insert(link.join).values(unique.map((x) => ({ [selfKey]: id, [otherKey]: x })) as any);
  });
}

/** camelCase property name of a column inside its table */
function propertyName(table: MySqlTable, column: MySqlColumn): string {
  const entry = Object.entries(getTableColumns(table)).find(([, c]) => c === column);
  if (!entry) throw new Error("Column not in table");
  return entry[0];
}

/** Load a record with the ids of its many-to-many relations ({ conditions: [{ id }] }) */
export async function getRecord(res: ResourceDef, id: number) {
  const row = await findRow(res.model, id);
  if (!row) return row;
  for (const f of res.fields) {
    if (f.type !== "relationMany") continue;
    const link = LINKS[res.model]?.[f.name];
    if (!link) continue;
    const linked = await db.select({ id: link.other }).from(link.join).where(eq(link.self, id));
    row[f.name] = linked.map((x) => ({ id: Number(x.id) }));
  }
  return row;
}

/** Options for relation dropdowns / checkbox lists */
export async function relationOptions(fields: FieldDef[]) {
  const out: Record<string, { value: number; label: string }[]> = {};
  for (const f of fields) {
    if ((f.type !== "relation" && f.type !== "relationMany") || !f.relation) continue;
    const { model, labelField, orderBy } = f.relation;
    const labelParts = labelField.split("+");
    const rows = (await db
      .select({ id: columnOf(model, "id"), ...Object.fromEntries(labelParts.map((p) => [p, columnOf(model, p)])) })
      .from(tableOf(model))
      .orderBy(asc(columnOf(model, orderBy ?? "id")))
      .limit(2000)) as Record<string, unknown>[];
    out[f.name] = rows.map((r) => ({ value: r.id as number, label: labelParts.map((p) => r[p]).filter(Boolean).join(" ") }));
  }
  return out;
}

/** Read "a.b.c" (and "a.b+a.c" joined with a space) from a row */
export function readPath(row: Record<string, unknown>, path: string): unknown {
  if (path.includes("+")) return path.split("+").map((p) => readPath(row, p)).filter(Boolean).join(" ");
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), row);
}
