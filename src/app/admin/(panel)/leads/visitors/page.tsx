import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bot, Eye, FileText, MessageCircle } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Empty, PageHeader, th, td } from "@/components/admin/ui";
import { countryLabel } from "@/lib/admin/insights";
import { cameFrom } from "@/lib/admin/journey";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Interested visitors" };

const DAYS = 14;

/**
 * Anonymous visitors who showed real interest (several pages, product views, a started quote,
 * a chat, a WhatsApp click) but have not shared contact details yet — so they are not leads.
 */
export default async function InterestedVisitorsPage() {
  await requireAdminPage("manageLeads");
  const rows = await interestedVisitors();
  return <VisitorsView rows={rows} />;
}

async function interestedVisitors() {
  const since = new Date(Date.now() - DAYS * 86_400_000);
  const sessions = await db.session.findMany({
    where: { lastSeenAt: { gte: since }, isBot: false, isDemo: false },
    orderBy: { lastSeenAt: "desc" },
    take: 600,
    select: { id: true, visitorId: true, lastSeenAt: true, startedAt: true, pageViews: true, country: true, city: true, device: true, channel: true, referrerHost: true, utmSource: true, landingPath: true },
  });
  const ids = sessions.map((s) => s.id);
  const [events, leadSessions, chats] = await Promise.all([
    db.event.groupBy({ by: ["sessionId", "name"], where: { sessionId: { in: ids }, name: { in: ["product_view", "quote_start", "whatsapp_click", "ai_chat_start", "customizer_start", "add_to_cart", "phone_click", "email_click"] } }, _count: true }),
    db.lead.findMany({ where: { sessionId: { not: null } }, select: { sessionId: true } }),
    db.aiConversation.findMany({ where: { sessionId: { in: ids }, kind: { not: "admin" } }, select: { id: true, sessionId: true } }),
  ]);
  // Visitors who already became a lead are on the Leads page instead.
  const leadSessionRows = await db.session.findMany({ where: { id: { in: leadSessions.map((l) => l.sessionId!) } }, select: { visitorId: true } });
  const known = new Set(leadSessionRows.map((s) => s.visitorId));
  const chatBySession = new Map(chats.map((c) => [c.sessionId!, c.id]));

  type Row = { sessionId: string; visitorId: string; visits: number; lastSeen: Date; pages: number; products: number; quote: boolean; whatsapp: boolean; studio: boolean; chatId: string | null; country: string | null; city: string | null; device: string; from: string; score: number };
  const byVisitor = new Map<string, Row>();
  for (const s of sessions) {
    if (known.has(s.visitorId)) continue;
    const ev = (n: string) => events.find((e) => e.sessionId === s.id && e.name === n)?._count ?? 0;
    const products = ev("product_view");
    const quote = ev("quote_start") > 0 || ev("add_to_cart") > 0;
    const whatsapp = ev("whatsapp_click") + ev("phone_click") + ev("email_click") > 0;
    const studio = ev("customizer_start") > 0;
    const chatId = chatBySession.get(s.id) ?? null;
    const prev = byVisitor.get(s.visitorId);
    const row: Row = prev
      ? { ...prev, visits: prev.visits + 1, pages: prev.pages + s.pageViews, products: prev.products + products, quote: prev.quote || quote, whatsapp: prev.whatsapp || whatsapp, studio: prev.studio || studio, chatId: prev.chatId ?? chatId, score: 0 }
      : { sessionId: s.id, visitorId: s.visitorId, visits: 1, lastSeen: s.lastSeenAt, pages: s.pageViews, products, quote, whatsapp, studio, chatId, country: s.country, city: s.city, device: s.device, from: cameFrom(s.channel, s.referrerHost, s.utmSource), score: 0 };
    row.score = row.pages + row.products * 3 + (row.quote ? 8 : 0) + (row.whatsapp ? 6 : 0) + (row.studio ? 5 : 0) + (row.chatId ? 5 : 0) + (row.visits - 1) * 4;
    byVisitor.set(s.visitorId, row);
  }
  return [...byVisitor.values()].filter((r) => r.score >= 4).sort((a, b) => b.score - a.score || b.lastSeen.getTime() - a.lastSeen.getTime()).slice(0, 100);
}

type VisitorRow = Awaited<ReturnType<typeof interestedVisitors>>[number];

function VisitorsView({ rows }: { rows: VisitorRow[] }) {
  return (
    <>
      <Link href="/admin/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All leads
      </Link>
      <PageHeader
        title="Interested visitors"
        description={`People who looked seriously in the last ${DAYS} days — several pages, products, a started quote, a chat — but haven't shared contact details yet. Hottest first.`}
      />
      <p className="mb-5 max-w-3xl rounded-xl border hairline bg-white/[0.03] p-3.5 text-sm leading-relaxed text-muted">
        Browsers never reveal a visitor&apos;s name, email or phone number, and collecting them secretly is illegal in Europe and the US. The moment one of
        these visitors uses the chat, the quote form, the price offer, the contact form or signs up, they move to <Link href="/admin/leads" className="text-accent hover:underline">Leads</Link> with
        everything they did here attached.
      </p>
      {rows.length === 0 ? (
        <Empty title="No interested visitors yet" body="As people browse products, chat or start a quote, the most interested ones appear here." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
          <table className="w-full min-w-[860px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>Visitor</th>
                <th className={th}>Came from</th>
                <th className={`${th} text-right`}>Visits</th>
                <th className={`${th} text-right`}>Pages</th>
                <th className={th}>Signals</th>
                <th className={th}>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.visitorId} className="border-b hairline last:border-0 hover:bg-white/[0.02]">
                  <td className={td}>
                    <Link href={`/admin/leads/visitors/${r.sessionId}`} className="font-medium hover:text-accent">
                      {[r.city, r.country ? countryLabel(r.country) : null].filter(Boolean).join(", ") || "Unknown location"}
                    </Link>
                    <span className="block text-xs capitalize text-subtle">{r.device}</span>
                  </td>
                  <td className={`${td} max-w-[220px] text-muted`}>{r.from}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.visits}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.pages}</td>
                  <td className={td}>
                    <span className="flex flex-wrap gap-1">
                      {r.products > 0 && (
                        <Badge tone="info">
                          <Eye className="mr-1 inline h-3 w-3" aria-hidden />
                          {r.products} product{r.products === 1 ? "" : "s"}
                        </Badge>
                      )}
                      {r.quote && (
                        <Badge tone="warn">
                          <FileText className="mr-1 inline h-3 w-3" aria-hidden />
                          started a quote
                        </Badge>
                      )}
                      {r.whatsapp && (
                        <Badge tone="good">
                          <MessageCircle className="mr-1 inline h-3 w-3" aria-hidden />
                          tapped WhatsApp / call
                        </Badge>
                      )}
                      {r.studio && <Badge tone="accent">used Design Studio</Badge>}
                      {r.chatId && (
                        <Link href={`/admin/chats/${r.chatId}`}>
                          <Badge tone="accent">
                            <Bot className="mr-1 inline h-3 w-3" aria-hidden />
                            chatted
                          </Badge>
                        </Link>
                      )}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{timeAgo(r.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
