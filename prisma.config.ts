import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma CLI configuration (Prisma 7).
 *
 * The CLI (push / migrate / studio) uses DIRECT_URL: Supabase's pooled
 * connection runs PgBouncer in transaction mode, which cannot execute DDL.
 * The running app uses the pooled DATABASE_URL through the driver adapter in
 * src/lib/db.ts.
 *
 * Guarded so `prisma generate` (run during the Vercel build) never needs a
 * connection string.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : "postgresql://unset",
  },
});
