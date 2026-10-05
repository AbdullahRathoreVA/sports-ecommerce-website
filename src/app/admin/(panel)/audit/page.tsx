import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Pagination, Empty, Badge, th, td } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Audit log" };
const PER_PAGE = 50;

const ENTITY_LINK: Record<string, (id: string) => string> = {
  Order: (id) => `/admin/orders/${id}`,
  Lead: (id) => `/admin/leads/${id}`,
  Product: (id) => `/admin/products/${id}`,
};

function summarise(diff: unknown): string {
  if (!diff || typeof diff !== "object") return "";
  const d = diff as Record<string, unknown>;
  const keys = Object.keys(d);
  if (!keys.length) return "";
  const looksLikeChanges = keys.every((k) => d[k] && typeof d[k] === "object" && "from" in (d[k] as object) && "to" in (d[k] as object));
  if (looksLikeChanges) return `Changed ${keys.slice(0, 6).join(", ")}${keys.length > 6 ? ` +${keys.length - 6}` : ""}`;
  return keys
    .slice(0, 4)
    .map((k) => {
      const v = d[k];
      return `${k}: ${typeof v === "object" ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 60)}`;
    })
    .join(" · ");
}

type SP = { q?: string; entity?: string; page?: string };

export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage("viewAudit");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.entity ? { entity: sp.entity.slice(0, 40) } : {}),
    ...(q ? { OR: [{ actorEmail: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }, { entityId: q }] } : {}),
  };
  const [rows, total, actions] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    db.auditLog.count({ where }),
    db.auditLog.groupBy({ by: ["entity"], _count: true, orderBy: { _count: { entity: "desc" } }, take: 12 }),
  ]);
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/audit${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Audit log" description="Every sign-in and every change made in the admin — who, what and when. Entries can't be edited or deleted from here." />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label htmlFor="aq" className="sr-only">Search the audit log</label>
        <input id="aq" name="q" defaultValue={q} placeholder="Search person, action or record id" className="h-11 w-full max-w-sm rounded-[var(--radius-control)] border hairline bg-surface px-3.5 text-[15px] outline-none focus:border-accent" />
        <button className="h-11 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink">Search</button>
      </form>
      <div className="scrollbar-none -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Link href={href({ entity: undefined, page: undefined })} className={`inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium ${!sp.entity ? "border-white bg-white text-ink" : "hairline text-muted"}`}>All</Link>
        {actions.map((a) => {
          return (
            <Link key={a.entity} href={href({ entity: a.entity, page: undefined })} className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${sp.entity === a.entity ? "border-white bg-white text-ink" : "hairline text-muted"}`}>
              {a.entity} <span className="font-mono opacity-60">{a._count}</span>
            </Link>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <Empty title="Nothing logged yet" />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
          <table className="w-full min-w-[820px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>When</th>
                <th className={th}>Who</th>
                <th className={th}>Action</th>
                <th className={th}>Record</th>
                <th className={th}>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const link = r.entityId && ENTITY_LINK[r.entity]?.(r.entityId);
                return (
                  <tr key={r.id} className="border-b hairline last:border-0">
                    <td className={`${td} whitespace-nowrap text-muted`}>{r.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className={td}>
                      {r.actorEmail ?? <span className="text-subtle">system</span>}
                      {r.ip && <span className="block font-mono text-xs text-subtle">{r.ip}</span>}
                    </td>
                    <td className={td}>
                      <Badge tone={r.action.includes("fail") || r.action.includes("lock") ? "bad" : r.action.includes("delete") || r.action.includes("purge") ? "warn" : "neutral"}>{r.action}</Badge>
                    </td>
                    <td className={`${td} text-muted`}>
                      {r.entity}
                      {r.entityId && (link ? <Link href={link} className="ml-1.5 font-mono text-xs text-accent hover:underline">{r.entityId.slice(0, 10)}</Link> : <span className="ml-1.5 font-mono text-xs">{r.entityId.slice(0, 10)}</span>)}
                    </td>
                    <td className={`${td} max-w-[360px] text-xs text-muted`}>{summarise(r.diff)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} href={(p) => href({ page: String(p) })} />
    </>
  );
}
