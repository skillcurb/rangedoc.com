/**
 * Drizzle Kit configuration (migrations / db push / studio).
 * ------------------------------------------------------------------
 *   npm run db:generate  → writes a SQL migration for schema changes into /drizzle
 *   npm run db:migrate   → applies pending migrations to the database
 *   npm run db:push      → syncs tables directly (handy for local experiments)
 *   npm run db:studio    → browse the data in Drizzle Studio
 */
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // camelCase properties ⇄ snake_case columns (same as src/lib/db.ts)
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
