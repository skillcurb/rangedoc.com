/**
 * MariaDB-safe relational queries (`db.query.*.findMany / findFirst` with `with`).
 * ------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * Drizzle loads nested relations (`with: { city: true, reviews: … }`) in ONE
 * SQL statement. For that it puts sub-queries in the FROM clause that point
 * back at the outer row ("correlated derived tables"), e.g.
 *
 *   (select … from (select * from cities where cities.id = providers.city_id) …)
 *
 * MySQL 8.0.14+ accepts this, but MariaDB (the database most cPanel hosts
 * run) does NOT – it fails with "Unknown column 'providers.city_id'".
 *
 * HOW IT WORKS
 * We keep Drizzle's normal API but load relations the way Prisma does:
 *   1. run the main query WITHOUT `with` (a plain SELECT – works everywhere)
 *   2. for every requested relation, run ONE extra query for all parent
 *      rows at once:   WHERE child.parent_id IN (1, 2, 3 …)
 *   3. attach the results to their parents in JavaScript
 * Nested relations repeat the same steps, so a whole tree is loaded with a
 * handful of simple queries (no N+1 problem) that run on MySQL 5.7/8.x and
 * MariaDB 10.x/11.x alike.
 *
 * Supported options inside `with` (everything this project uses):
 *   columns, where (SQL or callback), orderBy, limit, offset, extras, with
 * `limit`/`offset` on a "many" relation are applied per parent row, exactly
 * like Drizzle does.
 *
 * `enableSafeRelationalQueries(db)` replaces `db.query` (and `tx.query` inside
 * transactions), so the rest of the code base doesn't change at all.
 */
import { and, inArray, is, Many, normalizeRelation, getTableUniqueName, type SQL, type Column } from "drizzle-orm";

/* eslint-disable @typescript-eslint/no-explicit-any */

type QueryConfig = {
  columns?: Record<string, boolean>;
  with?: Record<string, boolean | QueryConfig>;
  where?: SQL | ((fields: any, ops: any) => SQL | undefined);
  orderBy?: unknown;
  limit?: number;
  offset?: number;
  extras?: unknown;
};

/** Drizzle's metadata about every table (columns + relations), keyed by TS name */
type TablesConfig = Record<string, { columns: Record<string, Column>; relations: Record<string, any> }>;

/** Anything with Drizzle's relational query builders (the db or a transaction) */
type HasQuery = { query: Record<string, any>; _: { schema?: TablesConfig; fullSchema: Record<string, unknown>; tableNamesMap: Record<string, string> } };

/** Find the TypeScript property name of a column object inside a table config */
function keyOf(columns: Record<string, Column>, column: Column): string {
  for (const [key, col] of Object.entries(columns)) if (col === column || col.name === column.name) return key;
  throw new Error(`Column "${column.name}" not found`);
}

/**
 * Make sure `key` is selected by a `columns` option. Returns the new columns
 * object and whether the key was added only for internal use (so it can be
 * removed from the result again).
 */
function ensureColumn(columns: Record<string, boolean> | undefined, key: string): { columns?: Record<string, boolean>; added: boolean } {
  if (!columns) return { columns, added: false }; // all columns are selected anyway
  const inclusion = Object.values(columns).some((v) => v === true);
  if (inclusion) return columns[key] ? { columns, added: false } : { columns: { ...columns, [key]: true }, added: true };
  // exclusion mode: { password: false } → just make sure our key isn't excluded
  if (columns[key] === false) {
    const copy = { ...columns };
    delete copy[key];
    return { columns: copy, added: true };
  }
  return { columns, added: false };
}

/** Build the relational loader for one database / transaction object */
function createLoader(target: HasQuery, original: Record<string, any>) {
  const schema = target._.schema!;
  const tableNamesMap = target._.tableNamesMap;

  async function load(tableName: string, config: QueryConfig = {}, first = false): Promise<any> {
    const { with: withConfig, ...rest } = config;
    const relationsWanted = Object.entries(withConfig ?? {}).filter(([, v]) => v);
    const builder = original[tableName];

    // Fast path – no relations: use Drizzle directly (a plain SELECT)
    if (relationsWanted.length === 0) return first ? builder.findFirst(rest) : builder.findMany(rest);

    const tableConfig = schema[tableName];
    // Work out the join columns of every requested relation first, so the
    // main query selects them even if `columns` didn't ask for them.
    const plans = relationsWanted.map(([name, relConfig]) => {
      const relation = tableConfig.relations[name];
      if (!relation) throw new Error(`Relation "${tableName}.${name}" is not defined in src/db/relations.ts`);
      const { fields, references } = normalizeRelation(schema as any, tableNamesMap, relation);
      const childTable = tableNamesMap[getTableUniqueName(relation.referencedTable)];
      return {
        name,
        many: is(relation, Many),
        childTable,
        localKey: keyOf(tableConfig.columns, fields[0]),
        remoteKey: keyOf(schema[childTable].columns, references[0]),
        config: (typeof relConfig === "object" ? relConfig : {}) as QueryConfig,
      };
    });

    let columns = rest.columns;
    const hiddenLocal: string[] = [];
    for (const p of plans) {
      const r = ensureColumn(columns, p.localKey);
      columns = r.columns;
      if (r.added) hiddenLocal.push(p.localKey);
    }

    // 1. main rows
    const mainQuery = { ...rest, ...(columns ? { columns } : {}) };
    const rows: any[] = first ? [await builder.findFirst(mainQuery)].filter(Boolean) : await builder.findMany(mainQuery);

    // Create the relation keys up front so they keep the order of `with`
    // (the queries below run in parallel and may finish in any order)
    for (const r of rows) for (const p of plans) r[p.name] = p.many ? [] : null;

    // 2. every relation with one extra query for all parents
    await Promise.all(
      plans.map(async (p) => {
        const ids = [...new Set(rows.map((r) => r[p.localKey]).filter((v) => v !== null && v !== undefined))];
        if (ids.length === 0) {
          for (const r of rows) r[p.name] = p.many ? [] : null;
          return;
        }
        const { limit, offset, where: userWhere, columns: childColumns, ...childRest } = p.config;
        const ensured = ensureColumn(childColumns, p.remoteKey);
        const children: any[] = await load(p.childTable, {
          ...childRest,
          ...(ensured.columns ? { columns: ensured.columns } : {}),
          // child.parent_id IN (…) AND the relation's own `where`
          where: (fields: any, ops: any) => {
            const own = typeof userWhere === "function" ? userWhere(fields, ops) : userWhere;
            const byParent = inArray(fields[p.remoteKey], ids);
            return own ? and(byParent, own) : byParent;
          },
        });

        // 3. group children by parent key (keeps the requested order)
        const groups = new Map<unknown, any[]>();
        for (const c of children) {
          const key = c[p.remoteKey];
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(c);
        }
        if (ensured.added) for (const c of children) delete c[p.remoteKey];

        for (const r of rows) {
          const list = groups.get(r[p.localKey]) ?? [];
          if (p.many) {
            const start = offset ?? 0;
            r[p.name] = limit !== undefined ? list.slice(start, start + limit) : list.slice(start);
          } else {
            r[p.name] = list[0] ?? null;
          }
        }
      }),
    );

    // Remove join columns that were only selected for internal use
    for (const r of rows) for (const k of hiddenLocal) delete r[k];
    return first ? (rows[0] ?? undefined) : rows;
  }

  // Same shape as Drizzle's `db.query`: { providers: { findMany, findFirst }, … }
  const query: Record<string, any> = {};
  for (const tableName of Object.keys(original)) {
    query[tableName] = {
      findMany: (config?: QueryConfig) => load(tableName, config, false),
      findFirst: (config?: QueryConfig) => load(tableName, config, true),
    };
  }
  return query;
}

/** Patch one db/transaction object (and transactions it opens) */
function patch<T extends HasQuery & { transaction?: (...args: any[]) => any }>(target: T): T {
  const original = target.query;
  target.query = createLoader(target, original);
  if (typeof target.transaction === "function") {
    const startTransaction = target.transaction.bind(target);
    // Transactions get their own `tx.query`, so patch those too
    (target as any).transaction = (fn: (tx: any) => Promise<unknown>, config?: unknown) =>
      startTransaction((tx: any) => fn(patch(tx)), config);
  }
  return target;
}

/**
 * Use the MariaDB-compatible relation loader for this Drizzle database.
 * The returned object has exactly the same type and API as before.
 */
export function enableSafeRelationalQueries<T>(database: T): T {
  return patch(database as unknown as HasQuery) as unknown as T;
}
