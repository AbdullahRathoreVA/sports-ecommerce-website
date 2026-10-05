import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { dayKey, eachDay, type DateRange } from "./range";

/**
 * Admin analytics, computed from first-party data with SQL aggregates.
 *
 * `includeDemo` controls whether rows flagged isDemo (the simulated review
 * data) are counted. The UI defaults to including them while the demo has no
 * real traffic, and labels every view that does.
 */

const schema = () => (process.env.DB_SCHEMA ?? "app").replace(/[^a-z_]/gi, "");
const t = (name: string) => Prisma.raw(`"${schema()}"."${name}"`);
const demo = (include: boolean, alias = "") => (include ? Prisma.empty : Prisma.raw(` AND ${alias ? `${alias}.` : ""}"isDemo" = false`));
const n = (v: unknown) => Number(v ?? 0);

export type Kpis = {
  visitors: number;
  sessions: number;
  pageViews: number;
  productViews: number;
  orders: number;
  revenueCents: number;
  quoteRequests: number;
  newLeads: number;
  conversionRate: number;
  cartAbandonment: number;
  returningRate: number;
  bounceRate: number;
};

async function kpisFor(from: Date, to: Date, includeDemo: boolean): Promise<Kpis> {
  const [s] = await db.$queryRaw<{ sessions: bigint; visitors: bigint; pageviews: bigint; returning: bigint; bounced: bigint }[]>`
    SELECT count(*) AS sessions, count(DISTINCT "visitorId") AS visitors, coalesce(sum("pageViews"),0) AS pageviews,
           count(*) FILTER (WHERE "isReturning") AS returning, count(*) FILTER (WHERE "pageViews" <= 1) AS bounced
    FROM ${t("Session")} WHERE "startedAt" >= ${from} AND "startedAt" < ${to} AND "isBot" = false ${demo(includeDemo)}`;
  const [e] = await db.$queryRaw<{ productviews: bigint; carted: bigint; purchased: bigint; converted: bigint }[]>`
    SELECT count(*) FILTER (WHERE name = 'product_view') AS productviews,
           count(DISTINCT "sessionId") FILTER (WHERE name = 'add_to_cart') AS carted,
           count(DISTINCT "sessionId") FILTER (WHERE name = 'purchase') AS purchased,
           count(DISTINCT "sessionId") FILTER (WHERE name IN ('purchase','quote_submit','ai_lead_created','contact_submit')) AS converted
    FROM ${t("Event")} WHERE "createdAt" >= ${from} AND "createdAt" < ${to} ${demo(includeDemo)}`;
  const [o] = await db.$queryRaw<{ orders: bigint; revenue: bigint }[]>`
    SELECT count(*) AS orders, coalesce(sum("totalCents"),0) AS revenue FROM ${t("Order")}
    WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND status NOT IN ('CANCELLED','REFUNDED') ${demo(includeDemo)}`;
  const [l] = await db.$queryRaw<{ leads: bigint; quotes: bigint }[]>`
    SELECT count(*) AS leads, count(*) FILTER (WHERE source <> 'CONTACT_FORM') AS quotes FROM ${t("Lead")}
    WHERE "createdAt" >= ${from} AND "createdAt" < ${to} ${demo(includeDemo)}`;

  const sessions = n(s?.sessions);
  const carted = n(e?.carted);
  return {
    visitors: n(s?.visitors),
    sessions,
    pageViews: n(s?.pageviews),
    productViews: n(e?.productviews),
    orders: n(o?.orders),
    revenueCents: n(o?.revenue),
    quoteRequests: n(l?.quotes),
    newLeads: n(l?.leads),
    conversionRate: sessions ? n(e?.converted) / sessions : 0,
    cartAbandonment: carted ? 1 - n(e?.purchased) / carted : 0,
    returningRate: sessions ? n(s?.returning) / sessions : 0,
    bounceRate: sessions ? n(s?.bounced) / sessions : 0,
  };
}

export async function getKpis(range: DateRange, includeDemo: boolean) {
  const [current, previous] = await Promise.all([kpisFor(range.from, range.to, includeDemo), kpisFor(range.prevFrom, range.prevTo, includeDemo)]);
  return { current, previous };
}

export type DayPoint = { day: string; sessions: number; visitors: number; orders: number; revenueCents: number; leads: number };

export async function getTimeSeries(range: DateRange, includeDemo: boolean): Promise<DayPoint[]> {
  const offset = Prisma.raw(`interval '${Number(process.env.ADMIN_TZ_OFFSET_MIN ?? 300)} minutes'`);
  const [sess, ord, lead] = await Promise.all([
    db.$queryRaw<{ d: string; sessions: bigint; visitors: bigint }[]>`
      SELECT to_char("startedAt" + ${offset}, 'YYYY-MM-DD') AS d, count(*) AS sessions, count(DISTINCT "visitorId") AS visitors
      FROM ${t("Session")} WHERE "startedAt" >= ${range.from} AND "startedAt" < ${range.to} AND "isBot" = false ${demo(includeDemo)} GROUP BY 1`,
    db.$queryRaw<{ d: string; orders: bigint; revenue: bigint }[]>`
      SELECT to_char("createdAt" + ${offset}, 'YYYY-MM-DD') AS d, count(*) AS orders, coalesce(sum("totalCents"),0) AS revenue
      FROM ${t("Order")} WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to} AND status NOT IN ('CANCELLED','REFUNDED') ${demo(includeDemo)} GROUP BY 1`,
    db.$queryRaw<{ d: string; leads: bigint }[]>`
      SELECT to_char("createdAt" + ${offset}, 'YYYY-MM-DD') AS d, count(*) AS leads
      FROM ${t("Lead")} WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to} ${demo(includeDemo)} GROUP BY 1`,
  ]);
  // The database formats the local day itself, so no driver timezone conversion can shift it.
  const key = (d: string) => d;
  const map = new Map<string, DayPoint>(eachDay(range).map((day) => [day, { day, sessions: 0, visitors: 0, orders: 0, revenueCents: 0, leads: 0 }]));
  for (const r of sess) {
    const p = map.get(key(r.d));
    if (p) Object.assign(p, { sessions: n(r.sessions), visitors: n(r.visitors) });
  }
  for (const r of ord) {
    const p = map.get(key(r.d));
    if (p) Object.assign(p, { orders: n(r.orders), revenueCents: n(r.revenue) });
  }
  for (const r of lead) {
    const p = map.get(key(r.d));
    if (p) p.leads = n(r.leads);
  }
  return [...map.values()];
}

export type Breakdown = { label: string; value: number }[];

async function sessionBreakdown(column: "channel" | "country" | "device" | "referrerHost" | "browser" | "os", range: DateRange, includeDemo: boolean, limit = 8): Promise<Breakdown> {
  const col = Prisma.raw(`"${column}"`);
  const rows = await db.$queryRaw<{ label: string | null; value: bigint }[]>`
    SELECT ${col} AS label, count(*) AS value FROM ${t("Session")}
    WHERE "startedAt" >= ${range.from} AND "startedAt" < ${range.to} AND "isBot" = false ${demo(includeDemo)}
    GROUP BY 1 ORDER BY 2 DESC LIMIT ${limit}`;
  return rows.map((r) => ({ label: r.label ?? "Unknown", value: n(r.value) }));
}

export async function getBreakdowns(range: DateRange, includeDemo: boolean) {
  const [channels, countries, devices, referrers, pages] = await Promise.all([
    sessionBreakdown("channel", range, includeDemo),
    sessionBreakdown("country", range, includeDemo, 10),
    sessionBreakdown("device", range, includeDemo),
    sessionBreakdown("referrerHost", range, includeDemo),
    db.$queryRaw<{ label: string; value: bigint }[]>`
      SELECT path AS label, count(*) AS value FROM ${t("Event")}
      WHERE name = 'page_view' AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to} ${demo(includeDemo)}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
  ]);
  return { channels, countries, devices, referrers: referrers.filter((r) => r.label !== "Unknown"), pages: pages.map((p) => ({ label: p.label, value: n(p.value) })) };
}

export type FunnelStep = { label: string; sessions: number };

export async function getFunnel(range: DateRange, includeDemo: boolean): Promise<FunnelStep[]> {
  const [r] = await db.$queryRaw<{ visits: bigint; viewed: bigint; intent: bigint; submit: bigint; won: bigint }[]>`
    WITH s AS (
      SELECT id FROM ${t("Session")} WHERE "startedAt" >= ${range.from} AND "startedAt" < ${range.to} AND "isBot" = false ${demo(includeDemo)}
    ), e AS (
      SELECT "sessionId", array_agg(DISTINCT name) AS names FROM ${t("Event")}
      WHERE "sessionId" IN (SELECT id FROM s) GROUP BY 1
    )
    SELECT (SELECT count(*) FROM s) AS visits,
      count(*) FILTER (WHERE 'product_view' = ANY(names)) AS viewed,
      count(*) FILTER (WHERE names && ARRAY['add_to_cart','quote_start','customizer_start']) AS intent,
      count(*) FILTER (WHERE names && ARRAY['checkout_start','quote_submit']) AS submit,
      count(*) FILTER (WHERE names && ARRAY['purchase','quote_submit','ai_lead_created','contact_submit']) AS won
    FROM e`;
  return [
    { label: "Visit", sessions: n(r?.visits) },
    { label: "Product view", sessions: n(r?.viewed) },
    { label: "Add to cart / start quote", sessions: n(r?.intent) },
    { label: "Checkout / submit", sessions: n(r?.submit) },
    { label: "Order / lead", sessions: n(r?.won) },
  ];
}

export type ProductPerf = {
  id: string;
  name: string;
  slug: string;
  category: string;
  views: number;
  uniqueViewers: number;
  clicks: number;
  addToCart: number;
  checkouts: number;
  orders: number;
  units: number;
  revenueCents: number;
  quotes: number;
  conversion: number;
  flags: ("high_interest_low_conversion" | "best_seller" | "most_wanted" | "high_conversion" | "underperforming")[];
};

export async function getProductPerformance(range: DateRange, includeDemo: boolean): Promise<ProductPerf[]> {
  const [products, ev, items, leads] = await Promise.all([
    db.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, name: true, slug: true, category: { select: { name: true } } } }),
    db.$queryRaw<{ pid: string; views: bigint; viewers: bigint; clicks: bigint; carts: bigint; checkouts: bigint }[]>`
      SELECT "productId" AS pid,
        count(*) FILTER (WHERE name = 'product_view') AS views,
        count(DISTINCT "visitorId") FILTER (WHERE name = 'product_view') AS viewers,
        count(*) FILTER (WHERE name = 'product_click') AS clicks,
        count(*) FILTER (WHERE name = 'add_to_cart') AS carts,
        count(*) FILTER (WHERE name = 'checkout_start') AS checkouts
      FROM ${t("Event")} WHERE "productId" IS NOT NULL AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to} ${demo(includeDemo)}
      GROUP BY 1`,
    db.$queryRaw<{ pid: string; orders: bigint; units: bigint; revenue: bigint }[]>`
      SELECT i."productId" AS pid, count(DISTINCT i."orderId") AS orders, coalesce(sum(i.quantity),0) AS units, coalesce(sum(i."totalCents"),0) AS revenue
      FROM ${t("OrderItem")} i JOIN ${t("Order")} o ON o.id = i."orderId"
      WHERE o."createdAt" >= ${range.from} AND o."createdAt" < ${range.to} AND o.status NOT IN ('CANCELLED','REFUNDED') ${demo(includeDemo, "o")}
      GROUP BY 1`,
    db.$queryRaw<{ pid: string; quotes: bigint }[]>`
      SELECT "productId" AS pid, count(*) AS quotes FROM ${t("Lead")}
      WHERE "productId" IS NOT NULL AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to} ${demo(includeDemo)} GROUP BY 1`,
  ]);
  const evMap = new Map(ev.map((r) => [r.pid, r]));
  const itemMap = new Map(items.map((r) => [r.pid, r]));
  const leadMap = new Map(leads.map((r) => [r.pid, r]));

  const rows = products.map<ProductPerf>((p) => {
    const e = evMap.get(p.id);
    const i = itemMap.get(p.id);
    const views = n(e?.views);
    const orders = n(i?.orders);
    const quotes = n(leadMap.get(p.id)?.quotes);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category.name,
      views,
      uniqueViewers: n(e?.viewers),
      clicks: n(e?.clicks),
      addToCart: n(e?.carts),
      checkouts: n(e?.checkouts),
      orders,
      units: n(i?.units),
      revenueCents: n(i?.revenue),
      quotes,
      conversion: views ? (orders + quotes) / views : 0,
      flags: [],
    };
  });

  // Flags are relative to this catalogue in this period, so they stay meaningful at any traffic level.
  const withViews = rows.filter((r) => r.views > 0);
  const medianViews = median(withViews.map((r) => r.views));
  const medianConv = median(withViews.map((r) => r.conversion));
  const topRevenue = [...rows].sort((a, b) => b.revenueCents - a.revenueCents).filter((r) => r.revenueCents > 0).slice(0, 3);
  const topDemand = [...rows].sort((a, b) => b.views + b.quotes * 20 - (a.views + a.quotes * 20)).filter((r) => r.views > 0).slice(0, 3);
  for (const r of rows) {
    if (topRevenue.includes(r)) r.flags.push("best_seller");
    if (topDemand.includes(r)) r.flags.push("most_wanted");
    if (r.views >= medianViews * 1.3 && r.conversion < medianConv * 0.6) r.flags.push("high_interest_low_conversion");
    if (r.views >= 10 && r.conversion >= medianConv * 1.6) r.flags.push("high_conversion");
    if (r.views > 0 && r.views < medianViews * 0.5 && r.orders + r.quotes === 0) r.flags.push("underperforming");
  }
  return rows.sort((a, b) => b.views - a.views);
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export async function getEventCounts(range: DateRange, includeDemo: boolean) {
  const rows = await db.$queryRaw<{ name: string; value: bigint; sessions: bigint }[]>`
    SELECT name, count(*) AS value, count(DISTINCT "sessionId") AS sessions FROM ${t("Event")}
    WHERE "createdAt" >= ${range.from} AND "createdAt" < ${range.to} ${demo(includeDemo)}
    GROUP BY 1 ORDER BY 2 DESC`;
  const labels = await db.$queryRaw<{ name: string; label: string; value: bigint }[]>`
    SELECT name, label, count(*) AS value FROM ${t("Event")}
    WHERE name IN ('cta_click','nav_click','whatsapp_click','search') AND label IS NOT NULL
      AND "createdAt" >= ${range.from} AND "createdAt" < ${range.to} ${demo(includeDemo)}
    GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 40`;
  return {
    events: rows.map((r) => ({ name: r.name, value: n(r.value), sessions: n(r.sessions) })),
    labels: labels.map((r) => ({ name: r.name, label: r.label, value: n(r.value) })),
  };
}

export async function getLiveSessions(includeDemo: boolean) {
  const since = new Date(Date.now() - 5 * 60_000);
  return db.session.findMany({
    where: { lastSeenAt: { gte: since }, isBot: false, ...(includeDemo ? {} : { isDemo: false }) },
    orderBy: { lastSeenAt: "desc" },
    take: 100,
    select: { id: true, lastPath: true, landingPath: true, device: true, browser: true, os: true, country: true, channel: true, referrerHost: true, startedAt: true, lastSeenAt: true, pageViews: true, isReturning: true },
  });
}

export async function hasDemoData() {
  return (await db.session.count({ where: { isDemo: true } })) > 0 || (await db.order.count({ where: { isDemo: true } })) > 0;
}

export { dayKey };
