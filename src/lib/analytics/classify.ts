import { createHash } from "node:crypto";

/**
 * Pure classification helpers for the collector. No personal data leaves
 * these functions: user-agents are reduced to coarse buckets, referrers to a
 * bare host, paths are stripped of query strings (which can carry PII).
 */

export type DeviceKind = "mobile" | "tablet" | "desktop" | "bot";

const BOT_RE =
  /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headless|lighthouse|pagespeed|curl|wget|python-requests|axios|node-fetch|go-http-client|vercel-screenshot|prerender/;

export function classifyDevice(ua: string): DeviceKind {
  const s = ua.toLowerCase();
  if (!s || BOT_RE.test(s)) return "bot";
  // Tablets first: many also contain "mobile" or "android".
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) return "mobile";
  return "desktop";
}

export function classifyBrowser(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes("edg/")) return "Edge";
  if (s.includes("opr/") || s.includes("opera")) return "Opera";
  if (s.includes("samsungbrowser")) return "Samsung Internet";
  if (s.includes("firefox") || s.includes("fxios")) return "Firefox";
  if (s.includes("chrome") || s.includes("crios")) return "Chrome";
  if (s.includes("safari")) return "Safari";
  return "Other";
}

export function classifyOs(ua: string): string {
  const s = ua.toLowerCase();
  if (s.includes("windows")) return "Windows";
  if (/iphone|ipad|ipod/.test(s)) return "iOS";
  if (s.includes("android")) return "Android";
  if (s.includes("mac os")) return "macOS";
  if (s.includes("linux")) return "Linux";
  return "Other";
}

export function referrerHost(referrer: string | null | undefined, selfHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host === selfHost.replace(/^www\./, "") ? null : host;
  } catch {
    return null;
  }
}

const SEARCH = /(^|\.)(google|bing|duckduckgo|yahoo|yandex|baidu|ecosia|brave)\./;
const SOCIAL = /(^|\.)(facebook|fb|instagram|linkedin|lnkd|twitter|x|t|tiktok|youtube|pinterest|reddit|whatsapp|wa)\.(com|co|me|in|net)$/;
const AI = /(^|\.)(chatgpt|openai|perplexity|claude|gemini|copilot|you)\.(com|ai)$/;

/** Acquisition channel from UTM first, then referrer host. */
export function classifyChannel(refHost: string | null, utmSource?: string | null, utmMedium?: string | null): string {
  const medium = (utmMedium ?? "").toLowerCase();
  const source = (utmSource ?? "").toLowerCase();
  if (/cpc|ppc|paid|ads?$/.test(medium)) return "paid";
  if (medium === "email" || source.includes("newsletter")) return "email";
  if (medium === "social" || /facebook|instagram|linkedin|tiktok|whatsapp/.test(source)) return "social";
  if (!refHost) return source ? "referral" : "direct";
  if (AI.test(refHost)) return "ai";
  if (SEARCH.test(refHost)) return "organic";
  if (SOCIAL.test(refHost) || refHost === "l.facebook.com" || refHost === "lm.facebook.com") return "social";
  return "referral";
}

/** Strip query and hash; reject anything that is not a plausible app path. */
export function normalisePath(path: string): string | null {
  if (typeof path !== "string" || !path.startsWith("/") || path.length > 200) return null;
  const clean = path.split(/[?#]/)[0]!;
  if (clean.startsWith("/admin") || clean.startsWith("/api")) return null;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
}

/**
 * Per-day anonymous id for visitors who opted out of persistent ids
 * (GPC / DNT). Counted once per day, never recognised across days, and not
 * reversible to an IP: the salt includes the date and the server secret.
 */
export function dailyVisitorId(ip: string, userAgent: string, secret: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return "d_" + createHash("sha256").update(`${ip}|${userAgent}|${day}|${secret}`).digest("hex").slice(0, 30);
}

const ID_RE = /^[a-zA-Z0-9_-]{8,40}$/;
export function isValidId(id: unknown): id is string {
  return typeof id === "string" && ID_RE.test(id);
}
