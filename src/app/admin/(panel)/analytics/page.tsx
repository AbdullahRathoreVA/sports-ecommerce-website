import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { getBreakdowns, getEventCounts, getFunnel, getProductPerformance, hasDemoData, type ProductPerf } from "@/lib/admin/metrics";
import { conversionByDimension, countryInterest, countryLabel } from "@/lib/admin/insights";
import { adminParams, type AdminSearchParams } from "@/lib/admin/params";
import { EVENT_LABELS } from "@/lib/analytics/events";
import { PageHeader, Card, DemoNotice, Badge, th, td } from "@/components/admin/ui";
import { BarList, Funnel } from "@/components/admin/charts";
import { RangePicker } from "@/components/admin/range-picker";
import { cn, formatMoney, formatNumber, formatPercent } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const FLAGS: Record<ProductPerf["flags"][number], { label: string; tone: "good" | "warn" | "info" | "accent" | "bad"; help: string }> = {
  best_seller: { label: "Best seller", tone: "good", help: "Top 3 by revenue" },
  most_wanted: { label: "Most wanted", tone: "accent", help: "Top 3 by views and quote requests" },
  high_conversion: { label: "Converts well", tone: "info", help: "Converts at 1.6× the catalogue median" },
  high_interest_low_conversion: { label: "Leaking", tone: "warn", help: "Many views, few orders or quotes — check price, photos, MOQ" },
  underperforming: { label: "Underperforming", tone: "bad", help: "Few views and no orders or quotes" },
};

const DIM_LABEL = { device: "Device", channel: "Traffic source", country: "Country" } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  await requireAdminPage("viewAnalytics");
  const sp = await searchParams;
  const { range, includeDemo, href, demoHref } = adminParams("/admin/analytics", sp);
  const flag = sp.flag && sp.flag in FLAGS ? (sp.flag as keyof typeof FLAGS) : null;

  const [perf, funnel, breakdowns, events, byDevice, byChannel, byCountry, interest, demoExists] = await Promise.all([
    getProductPerformance(range, includeDemo),
    getFunnel(range, includeDemo),
    getBreakdowns(range, includeDemo),
    getEventCounts(range, includeDemo),
    conversionByDimension("device", range, includeDemo),
    conversionByDimension("channel", range, includeDemo),
    conversionByDimension("country", range, includeDemo),
    countryInterest(range, includeDemo),
    hasDemoData(),
  ]);
  const rows = flag ? perf.filter((p) => p.flags.includes(flag)) : perf;
  const clickEvents = events.events.filter((e) => e.name !== "heartbeat" && e.name !== "page_view");
  const labelsBy = (name: string) => events.labels.filter((l) => l.name === name).slice(0, 8).map((l) => ({ label: l.label, value: l.value }));

  return (
    <>
      <PageHeader title="Analytics" description={`${range.label} · first-party, cookie-free tracking · Pakistan time`}>
        <RangePicker active={range.key} />
      </PageHeader>
      <DemoNotice show={demoExists} includeDemo={includeDemo} href={demoHref} />

      <Card title="Product performance" action={<span className="text-xs text-subtle">{rows.length} products</span>}>
        <div className="scrollbar-none -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
          <Link href={href({ flag: null })} className={cn("inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium", !flag ? "border-white bg-white text-ink" : "hairline text-muted")}>All</Link>
          {(Object.keys(FLAGS) as (keyof typeof FLAGS)[]).map((k) => (
            <Link key={k} href={href({ flag: k })} title={FLAGS[k].help} className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium", flag === k ? "border-white bg-white text-ink" : "hairline text-muted")}>
              {FLAGS[k].label} <span className="font-mono opacity-60">{perf.filter((p) => p.flags.includes(k)).length}</span>
            </Link>
          ))}
        </div>
        {flag && <p className="mb-3 text-sm text-muted">{FLAGS[flag].help}.</p>}
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[980px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>Views</th>
                <th className={`${th} text-right`}>Viewers</th>
                <th className={`${th} text-right`}>Card clicks</th>
                <th className={`${th} text-right`}>Add to cart</th>
                <th className={`${th} text-right`}>Checkouts</th>
                <th className={`${th} text-right`}>Orders</th>
                <th className={`${th} text-right`}>Units</th>
                <th className={`${th} text-right`}>Quotes</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hairline last:border-0">
                  <td className={td}>
                    <Link href={`/admin/products/${r.id}`} className="font-medium hover:text-accent">{r.name}</Link>
                    <span className="block text-xs text-subtle">{r.category}</span>
                    {r.flags.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {r.flags.map((f) => (
                          <Badge key={f} tone={FLAGS[f].tone}>{FLAGS[f].label}</Badge>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.views)}</td>
                  <td className={`${td} text-right tabular-nums text-muted`}>{formatNumber(r.uniqueViewers)}</td>
                  <td className={`${td} text-right tabular-nums text-muted`}>{formatNumber(r.clicks)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.addToCart)}</td>
                  <td className={`${td} text-right tabular-nums text-muted`}>{formatNumber(r.checkouts)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.orders)}</td>
                  <td className={`${td} text-right tabular-nums text-muted`}>{formatNumber(r.units)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.quotes)}</td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{formatMoney(r.revenueCents)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatPercent(r.conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-subtle">Conversion = (orders + quote requests) ÷ product views. Flags compare each product with the rest of the catalogue in this period.</p>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {([
          ["device", byDevice],
          ["channel", byChannel],
          ["country", byCountry.slice(0, 10)],
        ] as const).map(([dim, data]) => (
          <Card key={dim} title={`Conversion by ${DIM_LABEL[dim].toLowerCase()}`}>
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>{DIM_LABEL[dim]}</th>
                    <th className={`${th} text-right`}>Sessions</th>
                    <th className={`${th} text-right`}>Converted</th>
                    <th className={`${th} text-right`}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr><td className={`${td} text-muted`} colSpan={4}>No sessions in this period.</td></tr>
                  )}
                  {data.map((r) => (
                    <tr key={r.label} className="border-t hairline">
                      <td className={td}>{dim === "country" ? countryLabel(r.label) : cap(r.label)}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatNumber(r.sessions)}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatNumber(r.converted)}</td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{formatPercent(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Conversion funnel" action={<span className="text-xs text-subtle">Sessions reaching each step</span>}>
          <Funnel steps={funnel} />
        </Card>
        <Card title="What each country looks at" action={<span className="text-xs text-subtle">Product views by category</span>}>
          {interest.length === 0 ? (
            <p className="text-sm text-muted">No product views in this period.</p>
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className={th}>Country</th><th className={th}>Category</th><th className={`${th} text-right`}>Views</th></tr></thead>
                <tbody>
                  {interest.slice(0, 12).map((r, i) => (
                    <tr key={i} className="border-t hairline">
                      <td className={td}>{countryLabel(r.country)}</td>
                      <td className={`${td} text-muted`}>{cap(r.category.replace(/-/g, " "))}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatNumber(r.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Click analytics</h2>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Every tracked action">
          <div className="-mx-3 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className={th}>Action</th><th className={`${th} text-right`}>Count</th><th className={`${th} text-right`}>Sessions</th></tr></thead>
              <tbody>
                {clickEvents.length === 0 && (
                  <tr><td className={`${td} text-muted`} colSpan={3}>No actions in this period.</td></tr>
                )}
                {clickEvents.map((e) => (
                  <tr key={e.name} className="border-t hairline">
                    <td className={td}>{EVENT_LABELS[e.name as keyof typeof EVENT_LABELS] ?? e.name}</td>
                    <td className={`${td} text-right tabular-nums`}>{formatNumber(e.value)}</td>
                    <td className={`${td} text-right tabular-nums text-muted`}>{formatNumber(e.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
          <Card title="Buttons clicked"><BarList data={labelsBy("cta_click")} empty="No button clicks yet" /></Card>
          <Card title="WhatsApp clicks by page"><BarList data={labelsBy("whatsapp_click")} empty="No WhatsApp clicks yet" /></Card>
          <Card title="What people search for"><BarList data={labelsBy("search")} empty="No searches yet" /></Card>
          <Card title="Menu items used"><BarList data={labelsBy("nav_click")} empty="No menu clicks yet" /></Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Top pages"><BarList data={breakdowns.pages} /></Card>
        <Card title="Referring sites"><BarList data={breakdowns.referrers} empty="No referrals in this period" /></Card>
      </div>
    </>
  );
}
