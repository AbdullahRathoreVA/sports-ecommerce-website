import "server-only";
import { db } from "@/lib/db";
import { EVENT_LABELS, isEventName } from "@/lib/analytics/events";

export type JourneyStep = { at: Date; what: string; detail: string | null; path: string };

export type Journey = {
  visits: number;
  firstSeen: Date;
  lastSeen: Date;
  pageViews: number;
  country: string | null;
  city: string | null;
  device: string;
  browser: string | null;
  cameFrom: string;
  landing: string;
  products: { name: string; views: number }[];
  steps: JourneyStep[];
};

const CHANNEL: Record<string, string> = {
  direct: "Typed the address / bookmark",
  organic: "Google or another search engine",
  social: "Social media",
  referral: "A link on another website",
  paid: "An advert",
  email: "An email",
  ai: "An AI assistant (ChatGPT, Perplexity …)",
};

/** Human description of where a visit came from. */
export function cameFrom(channel: string, referrerHost: string | null, utmSource: string | null) {
  const base = CHANNEL[channel] ?? channel;
  const via = utmSource || referrerHost;
  return via ? `${base} (${via})` : base;
}

const NOISY = new Set(["heartbeat", "remove_from_cart", "filter_use", "nav_click"]);

/**
 * Everything one visitor did on the website, across all their visits: where they came from,
 * which products they looked at, and each step in order. Anonymous — the person only has a
 * name once they share it (chat, quote, contact form, sign-up).
 */
export async function visitorJourney(sessionId: string | null | undefined): Promise<Journey | null> {
  if (!sessionId) return null;
  const s = await db.session.findUnique({ where: { id: sessionId }, select: { visitorId: true } });
  if (!s) return null;
  const sessions = await db.session.findMany({ where: { visitorId: s.visitorId }, orderBy: { startedAt: "asc" }, take: 40 });
  if (sessions.length === 0) return null;
  const events = await db.event.findMany({
    where: { sessionId: { in: sessions.map((x) => x.id) }, name: { notIn: [...NOISY] } },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: { name: true, path: true, label: true, productId: true, category: true, createdAt: true },
  });
  const productIds = [...new Set(events.map((e) => e.productId).filter(Boolean) as string[])];
  const products = productIds.length ? await db.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } }) : [];
  const nameOf = new Map(products.map((p) => [p.id, p.name]));

  const views = new Map<string, number>();
  for (const e of events) {
    if (e.name === "product_view" && e.productId) {
      const n = nameOf.get(e.productId) ?? "A product";
      views.set(n, (views.get(n) ?? 0) + 1);
    }
  }
  const first = sessions[0]!;
  const last = sessions[sessions.length - 1]!;
  const steps: JourneyStep[] = events.map((e) => ({
    at: e.createdAt,
    what: isEventName(e.name) ? EVENT_LABELS[e.name] : e.name,
    detail: (e.productId && nameOf.get(e.productId)) || e.label || e.category || null,
    path: e.path,
  }));
  return {
    visits: sessions.length,
    firstSeen: first.startedAt,
    lastSeen: last.lastSeenAt,
    pageViews: sessions.reduce((n, x) => n + x.pageViews, 0),
    country: last.country ?? first.country,
    city: last.city ?? first.city,
    device: last.device,
    browser: last.browser,
    cameFrom: cameFrom(first.channel, first.referrerHost, first.utmSource),
    landing: first.landingPath,
    products: [...views.entries()].map(([name, n]) => ({ name, views: n })).sort((a, b) => b.views - a.views),
    steps,
  };
}
