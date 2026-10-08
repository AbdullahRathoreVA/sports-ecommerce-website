import "server-only";
import { generateText } from "ai";
import { db } from "@/lib/db";
import { withModel } from "@/lib/ai/provider";
import { getFunnel, getKpis, getProductPerformance, type Kpis } from "@/lib/admin/metrics";
import { buildInsights, conversionByDimension, countryInterest, countryLabel } from "@/lib/admin/insights";
import { resolveRange, type DateRange } from "@/lib/admin/range";

/**
 * The admin AI analyst. It answers questions about the business using a
 * compact "data pack" computed from the database for the chosen period —
 * the model never sees raw customer records (no names, emails or
 * addresses), and it is told to answer only from the numbers provided.
 * Without an AI provider, a deterministic analyst answers from the same pack.
 */

export type AnalystMessage = { role: "user" | "assistant"; content: string };

const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 ? 1 : 0)}%`;
const usd = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const delta = (c: number, p: number) => (p ? `${c >= p ? "+" : ""}${(((c - p) / p) * 100).toFixed(0)}% vs previous period` : "no previous data");

const packCache = new Map<string, { at: number; pack: Promise<DataPack> }>();

/** Cached for a minute per period, so follow-up questions answer fast. */
export function buildDataPack(rangeKey: string, includeDemo: boolean): Promise<DataPack> {
  const key = `${rangeKey}:${includeDemo}`;
  const hit = packCache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.pack;
  const pack = computeDataPack(rangeKey, includeDemo);
  packCache.set(key, { at: Date.now(), pack });
  pack.catch(() => packCache.delete(key));
  return pack;
}

async function computeDataPack(rangeKey: string, includeDemo: boolean) {
  const range: DateRange = resolveRange({ range: rangeKey });
  const [kpis, perf, funnel, devices, channels, countries, interest, leadsByStatus, ordersByStatus] = await Promise.all([
    getKpis(range, includeDemo),
    getProductPerformance(range, includeDemo),
    getFunnel(range, includeDemo),
    conversionByDimension("device", range, includeDemo),
    conversionByDimension("channel", range, includeDemo),
    conversionByDimension("country", range, includeDemo),
    countryInterest(range, includeDemo),
    db.lead.groupBy({ by: ["status"], _count: true, where: { createdAt: { gte: range.from, lt: range.to }, ...(includeDemo ? {} : { isDemo: false }) } }),
    db.order.groupBy({ by: ["status"], _count: true, _sum: { totalCents: true }, where: { createdAt: { gte: range.from, lt: range.to }, ...(includeDemo ? {} : { isDemo: false }) } }),
  ]);
  const insights = await buildInsights(range, includeDemo, perf, { kpis, devices, channels, interest });
  const r4 = (x: number) => Number(x.toFixed(4));
  const k = (key: keyof Kpis) => ({ current: r4(kpis.current[key]), previous: r4(kpis.previous[key]) });
  return {
    period: range.label,
    from: range.from.toISOString().slice(0, 10),
    to: range.to.toISOString().slice(0, 10),
    includesSimulatedDemoData: includeDemo,
    currency: "USD (amounts in cents)",
    kpis: Object.fromEntries((Object.keys(kpis.current) as (keyof Kpis)[]).map((key) => [key, k(key)])),
    funnel,
    products: perf.slice(0, 15).map((p) => ({ name: p.name, category: p.category, views: p.views, addToCart: p.addToCart, orders: p.orders, units: p.units, quotes: p.quotes, revenueCents: p.revenueCents, conversion: r4(p.conversion), flags: p.flags })),
    conversionByDevice: devices.map((d) => ({ device: d.label, sessions: d.sessions, converted: d.converted, rate: r4(d.rate) })),
    conversionByChannel: channels.map((d) => ({ channel: d.label, sessions: d.sessions, converted: d.converted, rate: r4(d.rate) })),
    conversionByCountry: countries.slice(0, 10).map((d) => ({ country: countryLabel(d.label), sessions: d.sessions, converted: d.converted, rate: r4(d.rate) })),
    productInterestByCountry: interest.slice(0, 12).map((r) => ({ country: countryLabel(r.country), category: r.category, views: r.views })),
    leadsByStatus: Object.fromEntries(leadsByStatus.map((l) => [l.status, l._count])),
    ordersByStatus: Object.fromEntries(ordersByStatus.map((o) => [o.status, { count: o._count, totalCents: o._sum.totalCents ?? 0 }])),
    computedInsights: insights.map((i) => `${i.title} — ${i.detail}`),
  };
}

export type DataPack = Awaited<ReturnType<typeof computeDataPack>>;

const SYSTEM = `You are the business analyst inside the admin panel of a Pakistani sportswear manufacturer and exporter (team kits, uniforms, tracksuits, hoodies, gym wear, American football gloves).
Rules:
1. Answer ONLY from the DATA PACK JSON. Never invent numbers, causes, competitors or benchmarks. If the data can't answer, say exactly what's missing.
2. Quote the specific figures you rely on (convert cents to dollars, ratios to percentages).
3. Separate what the data shows from your suggestion. Suggestions must be practical for a factory sales team (price, photos, MOQ, follow-up speed, WhatsApp/email, samples, product pages).
4. If includesSimulatedDemoData is true, add one short line noting the figures include simulated preview data.
5. If there are fewer than 20 sessions in the period, say the sample is too small to draw conclusions.
6. Be concise: short paragraphs or up to 6 bullets. Plain language, no jargon. Reply in the user's language (English, Urdu or Roman Urdu/Hindi).`;

/** Deterministic analyst: keyword-routed answers built from the same data pack. */
export function groundedAnswer(question: string, pack: DataPack): string {
  const q = question.toLowerCase();
  const K = pack.kpis as Record<string, { current: number; previous: number }>;
  const lines: string[] = [];
  const note = pack.includesSimulatedDemoData ? "\n\n_Figures include simulated preview data._" : "";
  if ((K.sessions?.current ?? 0) < 20) return `There were only ${K.sessions?.current ?? 0} sessions in ${pack.period.toLowerCase()} — too few to draw conclusions yet.${note}`;

  if (/(product|best|sell|top|worst|leak|item)/.test(q)) {
    const best = [...pack.products].sort((a, b) => b.revenueCents - a.revenueCents).slice(0, 3);
    const leaky = pack.products.filter((p) => p.flags.includes("high_interest_low_conversion"));
    lines.push(`**Top products by revenue (${pack.period}):**`);
    best.forEach((p) => lines.push(`- ${p.name}: ${usd(p.revenueCents)} from ${p.orders} orders, ${p.quotes} quote requests, ${p.views} views`));
    if (leaky.length) lines.push("", `**Leaking interest:** ${leaky.map((p) => `${p.name} (${p.views} views, ${pct(p.conversion)} conversion)`).join("; ")}. Review price, photos and MOQ on these pages.`);
  } else if (/(country|countries|market|uk|usa|us|europe|canada|where)/.test(q)) {
    lines.push(`**Conversion by country (${pack.period}):**`);
    pack.conversionByCountry.slice(0, 6).forEach((c) => lines.push(`- ${c.country}: ${c.sessions} sessions, ${c.converted} converted (${pct(c.rate)})`));
    const top = pack.productInterestByCountry.slice(0, 3);
    if (top.length) lines.push("", `Most viewed: ${top.map((t) => `${t.category.replace(/-/g, " ")} from ${t.country} (${t.views})`).join(", ")}.`);
  } else if (/(mobile|device|desktop|phone|tablet)/.test(q)) {
    lines.push(`**Conversion by device (${pack.period}):**`);
    pack.conversionByDevice.forEach((d) => lines.push(`- ${d.device}: ${d.sessions} sessions, ${pct(d.rate)} converted`));
  } else if (/(traffic|source|channel|google|instagram|social|seo|where.*come)/.test(q)) {
    lines.push(`**Traffic sources (${pack.period}):**`);
    pack.conversionByChannel.forEach((d) => lines.push(`- ${d.channel}: ${d.sessions} sessions, ${pct(d.rate)} converted`));
  } else if (/(lead|quote|rfq|enquir|inquir|follow)/.test(q)) {
    lines.push(`**Leads (${pack.period}):** ${K.newLeads?.current ?? 0} new (${delta(K.newLeads?.current ?? 0, K.newLeads?.previous ?? 0)}), ${K.quoteRequests?.current ?? 0} quote requests.`);
    lines.push(`By stage: ${Object.entries(pack.leadsByStatus).map(([s, c]) => `${s.toLowerCase()} ${c}`).join(", ") || "none"}.`);
    const fresh = (pack.leadsByStatus as Record<string, number>).NEW ?? 0;
    if (fresh) lines.push("", `${fresh} leads are still marked New — reply to these first; the fastest supplier usually wins the order.`);
  } else if (/(funnel|cart|checkout|abandon|drop)/.test(q)) {
    lines.push(`**Funnel (${pack.period}):**`);
    pack.funnel.forEach((f) => lines.push(`- ${f.label}: ${f.sessions} sessions`));
    lines.push("", `Cart abandonment: ${pct(K.cartAbandonment?.current ?? 0)}.`);
  } else {
    lines.push(`**${pack.period} at a glance:**`);
    lines.push(`- Visitors: ${K.visitors?.current ?? 0} (${delta(K.visitors?.current ?? 0, K.visitors?.previous ?? 0)})`);
    lines.push(`- Orders: ${K.orders?.current ?? 0}, revenue ${usd(K.revenueCents?.current ?? 0)} (${delta(K.revenueCents?.current ?? 0, K.revenueCents?.previous ?? 0)})`);
    lines.push(`- Leads: ${K.newLeads?.current ?? 0}, conversion rate ${pct(K.conversionRate?.current ?? 0)}`);
    if (pack.computedInsights.length) lines.push("", "**What stands out:**", ...pack.computedInsights.slice(0, 4).map((i) => `- ${i}`));
  }
  return lines.join("\n") + note;
}

export async function analyse(messages: AnalystMessage[], rangeKey: string, includeDemo: boolean) {
  const pack = await buildDataPack(rangeKey, includeDemo);
  const question = messages[messages.length - 1]?.content ?? "";
  const result = await withModel(
    async (model, call) => {
      const { text } = await generateText({
        model,
        system: `${SYSTEM}\n\nDATA PACK:\n${JSON.stringify(pack)}`,
        messages: messages.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
        temperature: 0.2,
        maxOutputTokens: 700,
        ...call,
      });
      if (!text.trim()) throw new Error("empty");
      return text.trim();
    },
    { label: "analyst", timeoutMs: 20_000 },
  );
  if (result) return { reply: result.value, engine: `llm:${result.engine}`, period: pack.period };
  return { reply: groundedAnswer(question, pack), engine: "grounded", period: pack.period };
}
