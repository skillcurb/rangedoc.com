/**
 * Drizzle database client (MySQL / MariaDB) + small query helpers.
 * ------------------------------------------------------------------
 * Drizzle talks to MySQL through the `mysql2` driver. One connection
 * pool is created and cached on `globalThis`, so Next.js hot-reloading in
 * development doesn't open a new pool on every file change.
 *
 * Works with MySQL 5.7/8.x and MariaDB 10.5+ (cPanel). The only MySQL-only
 * SQL Drizzle generates is in nested `with` queries – those are rewritten
 * by enableSafeRelationalQueries() below.
 *
 * Usage:
 *   import { db, t, eq } from "@/lib/db";
 *   const city = await db.query.cities.findFirst({ where: eq(t.cities.slug, "austin-tx") });
 *   await db.update(t.providers).set({ featured: true }).where(eq(t.providers.id, 5));
 */
import "server-only";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@/db/schema";
import * as relations from "@/db/relations";
import { enableSafeRelationalQueries } from "@/db/relational";

// Re-export the tables (as `t`) and the query operators most files need,
// so a page only has to import from "@/lib/db".
export * as t from "@/db/schema";
export { and, or, not, eq, ne, gt, gte, lt, lte, like, inArray, notInArray, isNull, isNotNull, between, exists, asc, desc, sql, count, sum, avg } from "drizzle-orm";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  const pool = mysql.createPool({
    uri: url,
    connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 10),
    // Keep DATETIME values in UTC (Drizzle reads/writes them as UTC strings)
    timezone: "Z",
  });
  const database = drizzle({
    client: pool,
    schema: { ...schema, ...relations },
    // camelCase in TypeScript ⇄ snake_case columns in MySQL
    casing: "snake_case",
    // "planetscale" mode = no LATERAL joins in generated SQL
    mode: "planetscale",
  });
  // Load `with: {…}` relations with simple IN (…) queries instead of
  // correlated sub-queries, so everything also runs on MariaDB (cPanel).
  // See src/db/relational.ts.
  return enableSafeRelationalQueries(database);
}

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

/** The database client or an open transaction (both have the same API) */
export type Db = typeof db;
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Flatten many-to-many rows loaded through a join table:
 *   pluck(provider.conditions, "condition") → Condition[]
 */
export function pluck<R, K extends keyof R>(rows: R[] | undefined | null, key: K): NonNullable<R[K]>[] {
  return (rows ?? []).map((r) => r[key]).filter((v): v is NonNullable<R[K]> => v != null);
}

/** Insert one row and return its new auto-increment id */
export async function insertId(query: { $returningId: () => PromiseLike<unknown[]> }): Promise<number> {
  const [row] = (await query.$returningId()) as { id: number }[];
  return Number(row.id);
}

/** MySQL duplicate-key error (unique index violated) */
export function isDuplicateKey(e: unknown): boolean {
  const err = e as { code?: string; errno?: number; cause?: { code?: string; errno?: number } };
  return err?.code === "ER_DUP_ENTRY" || err?.errno === 1062 || err?.cause?.code === "ER_DUP_ENTRY" || err?.cause?.errno === 1062;
}
