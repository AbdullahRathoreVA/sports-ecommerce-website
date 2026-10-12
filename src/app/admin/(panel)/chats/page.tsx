import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Empty, PageHeader, Pagination, th, td } from "@/components/admin/ui";
import { countryLabel } from "@/lib/admin/insights";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Chats" };

const PER_PAGE = 30;
type Msg = { role: string; content: string };

/** Every conversation visitors had with the website's AI assistant, newest first. */
export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  await requireAdminPage("manageLeads");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const where = { kind: { not: "admin" } };
  const all = await db.aiConversation.findMany({ where, orderBy: { updatedAt: "desc" }, take: 1000, select: { id: true, kind: true, sessionId: true, leadId: true, messages: true, updatedAt: true, createdAt: true } });
  const filtered = q ? all.filter((c) => JSON.stringify(c.messages).toLowerCase().includes(q.toLowerCase())) : all;
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sessionIds = rows.map((c) => c.sessionId).filter(Boolean) as string[];
  const [sessions, leads] = await Promise.all([
    db.session.findMany({ where: { id: { in: sessionIds } }, select: { id: true, country: true, city: true, device: true } }),
    db.lead.findMany({ where: { OR: [{ id: { in: rows.map((c) => c.leadId).filter(Boolean) as string[] } }, { sessionId: { in: sessionIds } }] }, select: { id: true, leadNumber: true, sessionId: true, name: true } }),
  ]);
  const sess = new Map(sessions.map((s) => [s.id, s]));
  const leadFor = (c: (typeof rows)[number]) => leads.find((l) => l.id === c.leadId || (c.sessionId && l.sessionId === c.sessionId));

  return (
    <>
      <PageHeader title="Chats" description="Every conversation visitors had with the AI assistant on the website — in full. Anyone who left an email or number is also on the Leads page." />
      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="cq" className="sr-only">Search chats</label>
        <input id="cq" name="q" defaultValue={q} placeholder="Search what people asked…" className="h-11 w-full max-w-sm rounded-[var(--radius-control)] border hairline bg-surface px-3.5 text-[15px] outline-none focus:border-accent" />
        <button className="h-11 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink">Search</button>
      </form>
      {rows.length === 0 ? (
        <Empty title={q ? "No chats match" : "No chats yet"} body="When a visitor talks to the assistant (the Chat button on the website), the whole conversation appears here." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
          <table className="w-full min-w-[820px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>First question</th>
                <th className={th}>Visitor</th>
                <th className={`${th} text-right`}>Messages</th>
                <th className={th}>Lead</th>
                <th className={th}>Last message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const msgs = (Array.isArray(c.messages) ? (c.messages as Msg[]) : []).filter((m) => m && typeof m.content === "string");
                const first = msgs.find((m) => m.role === "user")?.content ?? "(no question)";
                const s = c.sessionId ? sess.get(c.sessionId) : undefined;
                const lead = leadFor(c);
                return (
                  <tr key={c.id} className="border-b hairline last:border-0 hover:bg-white/[0.02]">
                    <td className={`${td} max-w-[380px]`}>
                      <Link href={`/admin/chats/${c.id}`} className="line-clamp-2 font-medium hover:text-accent">{first}</Link>
                      {c.kind !== "assistant" && <Badge className="mt-1">{c.kind}</Badge>}
                    </td>
                    <td className={`${td} text-muted`}>
                      {s ? [s.city, s.country ? countryLabel(s.country) : null].filter(Boolean).join(", ") || "Unknown" : "Unknown"}
                      {s && <span className="block text-xs capitalize text-subtle">{s.device}</span>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{msgs.length}</td>
                    <td className={td}>
                      {lead ? (
                        <Link href={`/admin/leads/${lead.id}`} className="font-mono text-sm text-accent hover:underline">{lead.leadNumber}</Link>
                      ) : (
                        <span className="text-xs text-subtle">no contact left</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap text-muted`}>{timeAgo(c.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(filtered.length / PER_PAGE)} href={(p) => `/admin/chats?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`} />
    </>
  );
}
