import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { requireAdminPage, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBreakdowns, getFunnel, getKpis, getProductPerformance, getTimeSeries, hasDemoData } from "@/lib/admin/metrics";
import { buildInsights, countryName } from "@/lib/admin/insights";
import { adminParams, type AdminSearchParams } from "@/lib/admin/params";
import { PageHeader, Card, StatTile, DemoNotice, Badge, ORDER_TONE, LEAD_TONE, humanise, th, td } from "@/components/admin/ui";
import { LineChart, BarList, Funnel } from "@/components/admin/charts";
import { RangePicker } from "@/components/admin/range-picker";
import { formatMoney, formatPercent, formatNumber, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const admin = await requireAdminPage("viewDashboard");
  const sp = await searchParams;
  const { range, includeDemo, demoHref } = adminParams("/admin", sp);
  const analytics = can(admin.role, "viewAnalytics");

  const since5 = new Date(Date.now() - 5 * 60_000);
  const [kpis, series, breakdowns, funnel, perf, demoExists, activeNow, recentOrders, recentLeads] = await Promise.all([
    getKpis(range, includeDemo),
    getTimeSeries(range, includeDemo),
    getBreakdowns(range, includeDemo),
    getFunnel(range, includeDemo),
    getProductPerformance(range, includeDemo),
    hasDemoData(),
    db.session.count({ where: { lastSeenAt: { gte: since5 }, isBot: false, ...(includeDemo ? {} : { isDemo: false }) } }),
    can(admin.role, "manageOrders")
      ? db.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, where: includeDemo ? {} : { isDemo: false }, select: { id: true, orderNumber: true, contactName: true, company: true, totalCents: true, currency: true, status: true, createdAt: true } })
      : Promise.resolve([]),
    can(admin.role, "manageLeads")
      ? db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5, where: includeDemo ? {} : { isDemo: false }, select: { id: true, leadNumber: true, name: true, company: true, productName: true, quantity: true, status: true, source: true, createdAt: true } })
      : Promise.resolve([]),
  ]);
  const insights = analytics ? await buildInsights(range, includeDemo, perf) : [];
  const { current: c, previous: p } = kpis;
  const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <>
      <PageHeader title={`Welcome back, ${admin.name.split(" ")[0]}`} description={`Business overview · ${range.label} · Pakistan time`}>
        <RangePicker active={range.key} />
      </PageHeader>
      <DemoNotice show={demoExists} includeDemo={includeDemo} href={demoHref} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatTile label="Visitors" value={formatNumber(c.visitors)} current={c.visitors} previous={p.visitors} />
        <StatTile label="Sessions" value={formatNumber(c.sessions)} current={c.sessions} previous={p.sessions} />
        <StatTile label="Page views" value={formatNumber(c.pageViews)} current={c.pageViews} previous={p.pageViews} />
        <StatTile label="Product views" value={formatNumber(c.productViews)} current={c.productViews} previous={p.productViews} />
        <StatTile label="Orders" value={formatNumber(c.orders)} current={c.orders} previous={p.orders} />
        <StatTile label="Revenue" value={formatMoney(c.revenueCents)} current={c.revenueCents} previous={p.revenueCents} />
        <StatTile label="Quote requests" value={formatNumber(c.quoteRequests)} current={c.quoteRequests} previous={p.quoteRequests} />
        <StatTile label="New leads" value={formatNumber(c.newLeads)} current={c.newLeads} previous={p.newLeads} />
        <StatTile label="Conversion rate" value={formatPercent(c.conversionRate)} current={c.conversionRate} previous={p.conversionRate} />
        <StatTile label="Cart abandonment" value={formatPercent(c.cartAbandonment)} current={c.cartAbandonment} previous={p.cartAbandonment} invert />
        <StatTile label="Returning visitors" value={formatPercent(c.returningRate)} current={c.returningRate} previous={p.returningRate} />
        <div className="rounded-[var(--radius-card)] border border-accent/30 bg-accent/[0.06] p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-signal animate-pulse-dot" aria-hidden /> Active now
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{activeNow}</p>
          <Link href="/admin/live" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
            Live view <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>

      {insights.length > 0 && (
        <Card title="What the data says" className="mt-6" action={<Link href="/admin/ai" className="text-xs font-semibold text-accent hover:underline">Ask the AI analyst →</Link>}>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {insights.map((i) => (
              <li key={i.id} className="rounded-xl border hairline bg-white/[0.02] p-4">
                <p className="flex items-start gap-2 text-sm font-semibold">
                  {i.tone === "good" ? <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden /> : i.tone === "warn" ? <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden /> : <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />}
                  {i.title}
                </p>
                <p className="mt-1.5 text-sm text-muted">{i.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Visitors per day">
          <LineChart name="Visitors per day" data={series.map((d) => ({ label: fmtDay(d.day), value: d.visitors }))} />
        </Card>
        <Card title="Revenue per day">
          <LineChart name="Revenue per day" data={series.map((d) => ({ label: fmtDay(d.day), value: d.revenueCents }))} kind="money" />
        </Card>
        <Card title="Leads & quote requests per day">
          <LineChart name="Leads per day" data={series.map((d) => ({ label: fmtDay(d.day), value: d.leads }))} />
        </Card>
        <Card title="Conversion funnel" action={<span className="text-xs text-subtle">Sessions reaching each step</span>}>
          <Funnel steps={funnel} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Traffic sources">
          <BarList data={breakdowns.channels.map((x) => ({ label: x.label[0]!.toUpperCase() + x.label.slice(1), value: x.value }))} />
        </Card>
        <Card title="Countries">
          <BarList data={breakdowns.countries.map((x) => ({ label: countryName(x.label).replace(/^the /, "").replace(/^./, (m) => m.toUpperCase()), value: x.value }))} />
        </Card>
        <Card title="Devices">
          <BarList data={breakdowns.devices.map((x) => ({ label: x.label[0]!.toUpperCase() + x.label.slice(1), value: x.value }))} />
        </Card>
        <Card title="Top pages">
          <BarList data={breakdowns.pages.slice(0, 8)} />
        </Card>
      </div>

      <Card title="Product performance" className="mt-6" action={<Link href="/admin/analytics" className="text-xs font-semibold text-accent hover:underline">Full analytics →</Link>}>
        <div className="-mx-4 overflow-x-auto sm:-mx-5">
          <table className="w-full min-w-[640px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>Views</th>
                <th className={`${th} text-right`}>Add to cart</th>
                <th className={`${th} text-right`}>Orders</th>
                <th className={`${th} text-right`}>Quotes</th>
                <th className={`${th} text-right`}>Revenue</th>
                <th className={`${th} text-right`}>Conv.</th>
              </tr>
            </thead>
            <tbody>
              {perf.slice(0, 6).map((r) => (
                <tr key={r.id} className="border-b hairline last:border-0">
                  <td className={td}>
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 inline-flex gap-1">
                      {r.flags.includes("best_seller") && <Badge tone="good">Best seller</Badge>}
                      {r.flags.includes("high_interest_low_conversion") && <Badge tone="warn">Leaking</Badge>}
                    </span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.views)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.addToCart)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.orders)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatNumber(r.quotes)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatMoney(r.revenueCents)}</td>
                  <td className={`${td} text-right tabular-nums`}>{formatPercent(r.conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {recentOrders.length > 0 && (
          <Card title="Latest orders" action={<Link href="/admin/orders" className="text-xs font-semibold text-accent hover:underline">All orders →</Link>}>
            <ul className="divide-y hairline">
              {recentOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-accent">
                    <span className="min-w-0">
                      <span className="block font-mono text-sm">{o.orderNumber}</span>
                      <span className="block truncate text-xs text-subtle">{o.company ?? o.contactName} · {timeAgo(o.createdAt)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{formatMoney(o.totalCents, o.currency)}</span>
                      <Badge tone={ORDER_TONE[o.status]}>{humanise(o.status)}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {recentLeads.length > 0 && (
          <Card title="Latest leads" action={<Link href="/admin/leads" className="text-xs font-semibold text-accent hover:underline">All leads →</Link>}>
            <ul className="divide-y hairline">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/leads/${l.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-accent">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{l.company ?? l.name}</span>
                      <span className="block truncate text-xs text-subtle">
                        {l.productName ?? "General enquiry"}
                        {l.quantity ? ` · ${l.quantity} units` : ""} · {timeAgo(l.createdAt)}
                      </span>
                    </span>
                    <Badge tone={LEAD_TONE[l.status]}>{humanise(l.status)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
