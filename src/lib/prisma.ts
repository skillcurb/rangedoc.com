/**
 * Prisma client singleton.
 * ------------------------------------------------------------------
 * Prisma 7 talks to MySQL through a "driver adapter". We use the official
 * `@prisma/adapter-mariadb` adapter (built on the `mariadb` driver, which
 * works with both MySQL 8+ and MariaDB 10.6+).
 *
 * In development Next.js hot-reloads modules, which would create a new
 * connection pool on every change. We cache the client on `globalThis`
 * so only one pool exists.
 */
import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  // The adapter accepts a normal mysql://USER:PASSWORD@HOST:3306/DATABASE string
  const adapter = new PrismaMariaDb(url);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
