import { NextResponse, type NextRequest } from "next/server";
// Import from @/lib/session only — @/lib/auth pulls in Prisma and bcrypt.
import { readToken, SESSION_COOKIE } from "@/lib/session";

/**
 * Request proxy (Next 16's replacement for middleware): security headers on
 * every response, plus a fast signature check in front of /admin.
 *
 * This is NOT the security boundary — it only proves the JWT is ours and
 * unexpired. The authoritative check (account active, tokenVersion current,
 * role permitted) runs in the admin layout and in every server action/API.
 */

const isProd = process.env.NODE_ENV === "production";

function contentSecurityPolicy(): string {
  // 'unsafe-inline' scripts: Next's inline bootstrap needs it without a nonce
  // pipeline; 'unsafe-eval' only in dev for HMR. 'wasm-unsafe-eval' lets the
  // meshopt decoder (WebAssembly) unpack the 3D jersey without allowing eval().
  const scriptSrc = isProd ? "'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com" : "'self' 'unsafe-inline' 'unsafe-eval'";
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    `connect-src 'self'${isProd ? "" : " ws: http://localhost:*"}`,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    // Google Maps embed for the factory location (loaded only on request).
    "frame-src https://www.google.com https://maps.google.com",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": contentSecurityPolicy(),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Microphone for our own pages only: voice questions in the chat.
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), interest-cohort=(), browsing-topics=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminArea = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  if (isAdminArea) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const claims = token ? await readToken(token) : null;
    if (!claims) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      // Only ever an internal path — never an open redirect.
      if (pathname !== "/admin") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(header, value);
  if (isProd) response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin") || pathname.startsWith("/account")) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|media/|models/|images/|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|mp4|glb)$).*)",
  ],
};
