/**
 * Fixed-window, in-memory rate limiter.
 *
 * Per serverless instance, so the effective ceiling is limit × warm instances.
 * That is enough to stop one script hammering a form. Anything that must hold
 * across instances (admin login lockout) is enforced in the database instead.
 * Swap `hit()` for Upstash Redis if distributed abuse becomes real — call
 * sites do not change.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function sweep(now: number) {
  if (buckets.size < 5_000) return;
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

export function hit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  existing.count += 1;
  const ok = existing.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Client IP from proxy headers. Spoofable, so only ever used for rate limiting
 * and country lookup — never for authorisation.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
