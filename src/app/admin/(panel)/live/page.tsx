import type { Metadata } from "next";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLiveSessions } from "@/lib/admin/metrics";
import { countryLabel } from "@/lib/admin/insights";
import { EVENT_LABELS } from "@/lib/analytics/events";
import { PageHeader, Card, Badge, Empty, StatTile, th, td } from "@/components/admin/ui";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Live" };

const DEVICE_ICON = { mobile: Smartphone, tablet: Tablet, desktop: Monitor } as const;
const HOT = new Set(["add_to_cart", "checkout_start", "purchase", "quote_start", "quote_submit", "whatsapp_click", "email_click", "phone_click", "contact_submit", "ai_lead_created", "customizer_complete", "spec_download"]);

export default async function LivePage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  await requireAdminPage("viewAnalytics");
  const { data } = await searchParams;
  const includeDemo = data !== "real";
  const since = new Date(Date.now() - 30 * 60_000);
  const [sessions, events] = await Promise.all([
    getLiveSessions(includeDemo),
    db.event.findMany({
      where: { createdAt: { gte: since }, name: { not: "heartbeat" }, ...(includeDemo ? {} : { isDemo: false }) },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { id: true, name: true, path: true, label: true, createdAt: true, session: { select: { country: true, device: true } } },
    }),
  ]);
  const byPage = new Map<string, number>();
  sessions.forEach((s) => byPage.set(s.lastPath, (byPage.get(s.lastPath) ?? 0) + 1));
  const topPages = [...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const mobile = sessions.filter((s) => s.device === "mobile").length;

  return (
    <>
      <PageHeader title="Live" description="Who is on the site right now (active in the last 5 minutes) and what they're doing.">
        <AutoRefresh seconds={15} />
      </PageHeader>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Active visitors" value={String(sessions.length)} hint="Last 5 minutes" />
        <StatTile label="On mobile" value={sessions.length ? `${Math.round((mobile / sessions.length) * 100)}%` : "—"} hint="Of active visitors" />
        <StatTile label="Actions in 30 min" value={String(events.length >= 60 ? "60+" : events.length)} hint="Clicks, views, enquiries" />
        <StatTile label="Hot actions" value={String(events.filter((e) => HOT.has(e.name)).length)} hint="Cart, quote, WhatsApp, email" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card title="Active sessions">
          {sessions.length === 0 ? (
            <Empty title="Nobody on the site right now" body="Visitors appear here within seconds of opening a page." />
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className={th}>Visitor</th>
                    <th className={th}>Now viewing</th>
                    <th className={th}>Came from</th>
                    <th className={`${th} text-right`}>Pages</th>
                    <th className={th}>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => {
                    const Icon = DEVICE_ICON[s.device as keyof typeof DEVICE_ICON] ?? Monitor;
                    return (
                      <tr key={s.id} className="border-t hairline">
                        <td className={td}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted" aria-label={s.device} />
                            <span>{s.country ? countryLabel(s.country) : "Unknown"}</span>
                            {s.isReturning && <Badge tone="info">returning</Badge>}
                          </span>
                          <span className="block text-xs text-subtle">{[s.browser, s.os].filter(Boolean).join(" · ")}</span>
                        </td>
                        <td className={`${td} max-w-[240px] truncate font-mono text-xs`}>{s.lastPath}</td>
                        <td className={`${td} text-muted`}>{s.referrerHost ?? s.channel}</td>
                        <td className={`${td} text-right tabular-nums`}>{s.pageViews}</td>
                        <td className={`${td} whitespace-nowrap text-muted`}>{timeAgo(s.lastSeenAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {topPages.length > 0 && (
            <div className="mt-5 border-t hairline pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-subtle">Pages open right now</p>
              <ul className="space-y-1.5 text-sm">
                {topPages.map(([p, n]) => (
                  <li key={p} className="flex justify-between gap-3">
                    <span className="truncate font-mono text-xs">{p}</span>
                    <span className="tabular-nums text-muted">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Activity feed" action={<span className="text-xs text-subtle">Last 30 minutes</span>}>
          {events.length === 0 ? (
            <p className="text-sm text-muted">No activity in the last 30 minutes.</p>
          ) : (
            <ol className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
              {events.map((e) => (
                <li key={e.id} className="flex gap-2.5 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${HOT.has(e.name) ? "bg-accent" : "bg-white/25"}`} aria-hidden />
                  <span className="min-w-0">
                    <span className={HOT.has(e.name) ? "font-semibold" : undefined}>{EVENT_LABELS[e.name as keyof typeof EVENT_LABELS] ?? e.name}</span>
                    {e.label && <span className="text-muted"> · {e.label}</span>}
                    <span className="block truncate font-mono text-xs text-subtle">{e.path}</span>
                    <span className="block text-xs text-subtle">
                      {timeAgo(e.createdAt)} · {e.session.country ? countryLabel(e.session.country) : "Unknown"} · {e.session.device}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
