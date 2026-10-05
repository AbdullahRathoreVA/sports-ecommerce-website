import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 client over the `pg` driver adapter, constructed lazily.
 *
 * Lazy because constructing at import time throws during `next build` when
 * DATABASE_URL is absent, long before any caller's try/catch can run. Deferring
 * to first property access keeps the marketing site buildable and serving with
 * no database; only the routes that need data show a graceful fallback.
 *
 * Supabase's pooler terminates TLS with its own CA. `rejectUnauthorized: false`
 * keeps the connection encrypted without bundling that CA; pin it via
 * DATABASE_CA_CERT in production if your threat model needs verification.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. See docs/DEPLOYMENT.md.");
  }

  // `pg` does not understand Prisma-style query params; strip them and pass
  // the schema through the adapter instead.
  const url = new URL(raw);
  const schema = url.searchParams.get("schema") ?? process.env.DB_SCHEMA ?? "public";
  url.search = "";

  const ca = process.env.DATABASE_CA_CERT;
  const adapter = new PrismaPg(
    {
      connectionString: url.toString(),
      ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
      // Serverless functions are short-lived; a small pool per instance plus
      // the Supabase pooler in front keeps us well inside connection limits.
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    },
    { schema },
  );

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function client(): PrismaClient {
  // Cached on globalThis so dev hot-reload does not leak a pool per edit.
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = client();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
