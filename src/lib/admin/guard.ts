import "server-only";

/**
 * Same-origin check for state-changing admin requests (defence in depth on
 * top of SameSite=strict cookies). Server Actions already verify Origin;
 * this covers the JSON route handlers.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Only allow internal, single-slash redirect targets after login. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/admin") || next.startsWith("//") || next.includes("\\")) return "/admin";
  return next;
}
