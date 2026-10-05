import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Badge, LEAD_TONE, humanise, Pagination, Empty, th, td } from "@/components/admin/ui";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads & quotes" };

const STAGES = ["ALL", "NEW", "CONTACTED", "QUALIFIED", "QUOTED", "NEGOTIATING", "WON", "LOST"] as const;
const SOURCES = ["QUOTE_FORM", "PRODUCT_PAGE", "CONTACT_FORM", "AI_ASSISTANT", "DESIGN_STUDIO", "PRODUCT_FINDER"] as const;
const SOURCE_LABEL: Record<string, string> = {
  QUOTE_FORM: "Quote form",
  PRODUCT_PAGE: "Product page",
  CONTACT_FORM: "Contact form",
  AI_ASSISTANT: "AI assistant",
  DESIGN_STUDIO: "Design Studio",
  PRODUCT_FINDER: "Product finder",
};
const PER_PAGE = 25;

type SP = { status?: string; source?: string; q?: string; page?: string; data?: string; mine?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdminPage("manageLeads");
  const sp = await searchParams;
  const status = STAGES.includes(sp.status as (typeof STAGES)[number]) ? sp.status! : "ALL";
  const source = SOURCES.includes(sp.source as (typeof SOURCES)[number]) ? sp.source : undefined;
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const base: Prisma.LeadWhereInput = {
    ...(sp.data === "real" ? { isDemo: false } : {}),
    ...(source ? { source: source as Prisma.LeadWhereInput["source"] } : {}),
    ...(sp.mine ? { assignedToId: admin.id } : {}),
    ...(q
      ? {
          OR: [
            { leadNumber: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { productName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const where: Prisma.LeadWhereInput = { ...base, ...(status !== "ALL" ? { status: status as Prisma.LeadWhereInput["status"] } : {}) };
  const [leads, total, counts] = await Promise.all([
    db.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, include: { assignedTo: { select: { name: true } } } }),
    db.lead.count({ where }),
    db.lead.groupBy({ by: ["status"], _count: true, where: base }),
  ]);
  const countOf = (s: string) => (s === "ALL" ? counts.reduce((n, c) => n + c._count, 0) : counts.find((c) => c.status === s)?._count ?? 0);
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/leads${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Leads & quotes" description="Every quote request, contact message and AI-captured enquiry. Reply fast — the first supplier to respond usually wins." />
      <div className="scrollbar-none -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STAGES.map((s) => (
          <Link key={s} href={href({ status: s === "ALL" ? undefined : s, page: undefined })} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium", status === s ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
            {s === "ALL" ? "All" : humanise(s)} <span className="font-mono text-xs opacity-60">{countOf(s)}</span>
          </Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        {status !== "ALL" && <input type="hidden" name="status" value={status} />}
        <label htmlFor="lq" className="sr-only">Search leads</label>
        <input id="lq" name="q" defaultValue={q} placeholder="Search reference, name, company, product" className="h-11 w-full max-w-sm rounded-[var(--radius-control)] border hairline bg-surface px-3.5 text-[15px] outline-none focus:border-accent" />
        <label htmlFor="ls" className="sr-only">Source</label>
        <select id="ls" name="source" defaultValue={source ?? ""} className="h-11 rounded-[var(--radius-control)] border hairline bg-surface px-3 text-sm">
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
          ))}
        </select>
        <label className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border hairline px-3 text-sm">
          <input type="checkbox" name="mine" value="1" defaultChecked={Boolean(sp.mine)} className="accent-[var(--color-accent)]" /> Assigned to me
        </label>
        <button className="h-11 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink">Filter</button>
      </form>

      {leads.length === 0 ? (
        <Empty title="No leads match" body="New quote requests and enquiries appear here the moment they're submitted." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
          <table className="w-full min-w-[880px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>Lead</th>
                <th className={th}>Customer</th>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={th}>Source</th>
                <th className={th}>Status</th>
                <th className={th}>Owner</th>
                <th className={th}>Received</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b hairline last:border-0 hover:bg-white/[0.02]">
                  <td className={td}>
                    <Link href={`/admin/leads/${l.id}`} className="font-mono font-medium text-fg hover:text-accent">{l.leadNumber}</Link>
                    {l.isDemo && <Badge className="ml-2">demo</Badge>}
                  </td>
                  <td className={td}>
                    <span className="block font-medium">{l.company ?? l.name}</span>
                    <span className="block text-xs text-subtle">{l.country ?? "—"} · prefers {l.preferredChannel}</span>
                  </td>
                  <td className={`${td} text-muted`}>{l.productName ?? "General"}</td>
                  <td className={`${td} text-right tabular-nums`}>{l.quantity?.toLocaleString() ?? "—"}</td>
                  <td className={`${td} text-muted`}>{SOURCE_LABEL[l.source]}</td>
                  <td className={td}><Badge tone={LEAD_TONE[l.status]}>{humanise(l.status)}</Badge></td>
                  <td className={`${td} text-muted`}>{l.assignedTo?.name ?? <span className="text-subtle">Unassigned</span>}</td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} href={(p) => href({ page: String(p) })} />
    </>
  );
}
