/**
 * Prisma 7 configuration file.
 * ------------------------------------------------------------------
 * Prisma 7 no longer reads the database URL from schema.prisma, and it
 * no longer loads `.env` automatically — so we load it with dotenv here.
 */
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Where the data model lives
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npm run db:seed` runs this command
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // PostgreSQL connection string from .env
    url: env("DATABASE_URL"),
  },
});
