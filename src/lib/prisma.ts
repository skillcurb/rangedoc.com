/**
 * Prisma client singleton.
 * ------------------------------------------------------------------
 * Prisma 7 talks to PostgreSQL through a "driver adapter". We use the
 * official `@prisma/adapter-pg` adapter (built on the `pg` driver).
 *
 * In development Next.js hot-reloads modules, which would create a new
 * connection pool on every change. We cache the client on `globalThis`
 * so only one pool exists.
 */
import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  // The adapter accepts a normal postgresql:// connection string
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
