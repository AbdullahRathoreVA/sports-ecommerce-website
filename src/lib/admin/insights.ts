import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getKpis, getProductPerformance, type ProductPerf } from "./metrics";
import type { DateRange } from "./range";

/**
 * Deterministic business insights. Every sentence is computed from the
 * period's real numbers — nothing is generated without data behind it, and
 * thresholds avoid "insights" drawn from a handful of sessions.
 */

export type Insight = { id: string; tone: "good" | "warn" | "info"; title: string; detail: string };

const schema = () => (process.env.DB_SCHEMA ?? "app").replace(/[^a-z_]/gi, "");
const t = (name: string) => Prisma.raw(`"${schema()}"."${name}"`);
const demo = (include: boolean, alias = "") => (include ? Prisma.empty : Prisma.raw(` AND ${alias ? `${alias}.` : ""}"isDemo" = false`));
const n = (v: unknown) => Number(v ?? 0);
const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;

export async function conversionByDimension(dim: "device" | "channel" | "country", range: DateRange, includeDemo: boolean) {
  const col = Prisma.raw(`s."${dim}"`);
  const rows = await db.$queryRaw<{ label: string | null; sessions: bigint; converted: bigint }[]>`
    SELECT ${col} AS label, count(DISTINCT s.id) AS sessions,
      count(DISTINCT s.id) FILTER (WHERE e.name IN ('purchase','quote_submit','ai_lead_created','contact_submit')) AS converted
    FROM ${t("Session")} s LEFT JOIN ${t("Event")} e ON e."sessionId" = s.id
    WHERE s."startedAt" >= ${range.from} AND s."startedAt" < ${range.to} AND s."isBot" = false ${demo(includeDemo, "s")}
    GROUP BY 1 ORDER BY 2 DESC`;
  return rows.map((r) => ({ label: r.label ?? "Unknown", sessions: n(r.sessions), converted: n(r.converted), rate: n(r.sessions) ? n(r.converted) / n(r.sessions) : 0 }));
}

export async function countryInterest(range: DateRange, includeDemo: boolean) {
  const rows = await db.$queryRaw<{ country: string | null; category: string | null; views: bigint }[]>`
    SELECT s.country, e.category, count(*) AS views
    FROM ${t("Event")} e JOIN ${t("Session")} s ON s.id = e."sessionId"
    WHERE e.name = 'product_view' AND e."createdAt" >= ${range.from} AND e."createdAt" < ${range.to} ${demo(includeDemo, "e")}
    GROUP BY 1, 2 ORDER BY 3 DESC`;
  return rows.map((r) => ({ country: r.country ?? "Unknown", category: r.category ?? "unknown", views: n(r.views) }));
}

const COUNTRY: Record<string, string> = {
  GB: "the UK", US: "the US", PK: "Pakistan", DE: "Germany", AE: "the UAE", AU: "Australia", CA: "Canada", NL: "the Netherlands", FR: "France",
  SA: "Saudi Arabia", IE: "Ireland", IT: "Italy", ZA: "South Africa", SE: "Sweden", NZ: "New Zealand",
};
export const countryName = (code: string) => COUNTRY[code] ?? code;
/** For lists and tables: "UK", not "the UK". */
export const countryLabel = (code: string) => countryName(code).replace(/^the /, "");
const catName = (slug: string) => slug.replace(/-/g, " ");

type Precomputed = {
  kpis: Awaited<ReturnType<typeof getKpis>>;
  devices: Awaited<ReturnType<typeof conversionByDimension>>;
  channels: Awaited<ReturnType<typeof conversionByDimension>>;
  interest: Awaited<ReturnType<typeof countryInterest>>;
};

/** Pass `pre` when the caller already computed these, to avoid running the queries twice. */
export async function buildInsights(range: DateRange, includeDemo: boolean, perf?: ProductPerf[], pre?: Precomputed): Promise<Insight[]> {
  const [kpis, products, devices, channels, interest] = await Promise.all([
    pre?.kpis ?? getKpis(range, includeDemo),
    perf ? Promise.resolve(perf) : getProductPerformance(range, includeDemo),
    pre?.devices ?? conversionByDimension("device", range, includeDemo),
    pre?.channels ?? conversionByDimension("channel", range, includeDemo),
    pre?.interest ?? countryInterest(range, includeDemo),
  ]);
  const out: Insight[] = [];
  const { current: c, previous: p } = kpis;

  if (c.sessions < 20) {
    return [{ id: "low-data", tone: "info", title: "Not enough traffic yet", detail: `Only ${c.sessions} sessions in this period — insights appear once there are at least 20.` }];
  }

  // 1. High interest, low conversion.
  const leaky = products.filter((x) => x.flags.includes("high_interest_low_conversion")).sort((a, b) => b.views - a.views)[0];
  if (leaky) {
    out.push({
      id: `leaky-${leaky.slug}`,
      tone: "warn",
      title: `${leaky.name}: lots of interest, few conversions`,
      detail: `${leaky.views.toLocaleString()} views but only ${leaky.orders} orders and ${leaky.quotes} quote requests (${pct(leaky.conversion)}). Check its price, photos and call-to-action.`,
    });
  }

  // 2. Best seller / most wanted.
  const best = [...products].sort((a, b) => b.revenueCents - a.revenueCents)[0];
  if (best && best.revenueCents > 0) {
    out.push({
      id: `best-${best.slug}`,
      tone: "good",
      title: `${best.name} is your top earner`,
      detail: `${best.orders} orders and ${best.units.toLocaleString()} units this period — consider featuring it on the homepage and in WhatsApp catalogues.`,
    });
  }
  const wanted = [...products].sort((a, b) => b.quotes - a.quotes)[0];
  if (wanted && wanted.quotes >= 3 && wanted.slug !== best?.slug) {
    out.push({ id: `wanted-${wanted.slug}`, tone: "info", title: `Most requested for quotes: ${wanted.name}`, detail: `${wanted.quotes} quote requests — a sign of B2B demand worth a ready price list.` });
  }

  // 3. Device conversion gap (only when both groups are big enough).
  const mobile = devices.find((d) => d.label === "mobile");
  const desktop = devices.find((d) => d.label === "desktop");
  if (mobile && desktop && mobile.sessions >= 30 && desktop.sessions >= 30 && desktop.rate > 0 && mobile.rate > 0) {
    const diff = mobile.rate / desktop.rate - 1;
    if (Math.abs(diff) >= 0.15) {
      out.push({
        id: "device-gap",
        tone: diff > 0 ? "good" : "warn",
        title: diff > 0 ? `Mobile visitors convert ${pct(diff)} better than desktop` : `Mobile converts ${pct(-diff)} worse than desktop`,
        detail: `Mobile ${pct(mobile.rate)} vs desktop ${pct(desktop.rate)} across ${mobile.sessions + desktop.sessions} sessions.${diff < 0 ? " Review the mobile quote and checkout steps." : ""}`,
      });
    }
  }

  // 4. Country × category interest.
  const byCountry = new Map<string, { total: number; top: { category: string; views: number } }>();
  for (const r of interest) {
    const cur = byCountry.get(r.country);
    if (!cur) byCountry.set(r.country, { total: r.views, top: { category: r.category, views: r.views } });
    else {
      cur.total += r.views;
      if (r.views > cur.top.views) cur.top = { category: r.category, views: r.views };
    }
  }
  const topCountries = [...byCountry.entries()].filter(([code]) => code !== "Unknown").sort((a, b) => b[1].total - a[1].total).slice(0, 2);
  for (const [code, v] of topCountries) {
    if (v.total < 15) continue;
    out.push({
      id: `country-${code}`,
      tone: "info",
      title: `Visitors from ${countryName(code)} mostly view ${catName(v.top.category)}`,
      detail: `${pct(v.top.views / v.total)} of ${v.total} product views from ${countryName(code)} were ${catName(v.top.category)} — a natural target for ads or outreach there.`,
    });
  }

  // 5. Traffic and lead trend vs previous period.
  if (p.sessions >= 20) {
    const d = c.sessions / p.sessions - 1;
    if (Math.abs(d) >= 0.1) {
      out.push({
        id: "traffic-trend",
        tone: d > 0 ? "good" : "warn",
        title: d > 0 ? `Traffic up ${pct(d)} on the previous period` : `Traffic down ${pct(-d)} on the previous period`,
        detail: `${c.sessions.toLocaleString()} sessions vs ${p.sessions.toLocaleString()}. Leads: ${c.newLeads} vs ${p.newLeads}.`,
      });
    }
  }

  // 6. Best channel.
  const goodChannels = channels.filter((x) => x.sessions >= 25).sort((a, b) => b.rate - a.rate);
  if (goodChannels.length >= 2 && goodChannels[0]!.rate > 0) {
    const top = goodChannels[0]!;
    out.push({ id: "channel", tone: "info", title: `${top.label[0]!.toUpperCase() + top.label.slice(1)} traffic converts best`, detail: `${pct(top.rate)} of ${top.sessions} ${top.label} sessions became an order or enquiry.` });
  }

  // 7. Cart abandonment.
  if (c.cartAbandonment >= 0.6) {
    out.push({ id: "abandon", tone: "warn", title: `${pct(c.cartAbandonment)} of carts are abandoned`, detail: "Most buyers add to cart but don't place the order. Make sure WhatsApp help and payment details are clear at checkout." });
  }

  return out.slice(0, 6);
}
