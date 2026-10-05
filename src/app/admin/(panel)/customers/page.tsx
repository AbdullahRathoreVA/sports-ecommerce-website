import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Badge, humanise, Pagination, Empty, th, td } from "@/components/admin/ui";
import { countryLabel } from "@/lib/admin/insights";
import { formatMoney, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Customers" };
const PER_PAGE = 30;

type SP = { q?: string; page?: string; data?: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage("viewCustomers");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.CustomerWhereInput = {
    ...(sp.data === "real" ? { isDemo: false } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { orders: true, leads: true } } },
    }),
    db.customer.count({ where }),
  ]);
  // Lifetime value only counts orders that weren't cancelled or refunded.
  const spend = customers.length
    ? await db.order.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customers.map((c) => c.id) }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
        _sum: { totalCents: true },
        _max: { createdAt: true },
      })
    : [];
  const spendOf = new Map(spend.map((s) => [s.customerId, s]));
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/customers${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Customers" description="Everyone who has ordered, asked for a quote or contacted you. Created automatically — visitors never need an account." />
      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="cq" className="sr-only">Search customers</label>
        <input id="cq" name="q" defaultValue={q} placeholder="Search name, email, company" className="h-11 w-full max-w-sm rounded-[var(--radius-control)] border hairline bg-surface px-3.5 text-[15px] outline-none focus:border-accent" />
        <button className="h-11 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink">Search</button>
      </form>
      {customers.length === 0 ? (
        <Empty title="No customers yet" body="A customer record is created from the first order, quote request or message." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
          <table className="w-full min-w-[760px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Country</th>
                <th className={th}>First contact</th>
                <th className={`${th} text-right`}>Orders</th>
                <th className={`${th} text-right`}>Enquiries</th>
                <th className={`${th} text-right`}>Lifetime value</th>
                <th className={th}>Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const s = spendOf.get(c.id);
                return (
                  <tr key={c.id} className="border-b hairline last:border-0 hover:bg-white/[0.02]">
                    <td className={td}>
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-fg hover:text-accent">{c.company ?? c.name}</Link>
                      {c.isDemo && <Badge className="ml-2">demo</Badge>}
                      <span className="block text-xs text-subtle">{c.company ? `${c.name} · ` : ""}{c.email}</span>
                    </td>
                    <td className={`${td} text-muted`}>{c.country ? countryLabel(c.country) : "—"}</td>
                    <td className={`${td} text-muted`}>{humanise(c.source)}</td>
                    <td className={`${td} text-right tabular-nums`}>{c._count.orders}</td>
                    <td className={`${td} text-right tabular-nums`}>{c._count.leads}</td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{s?._sum.totalCents ? formatMoney(s._sum.totalCents) : "—"}</td>
                    <td className={`${td} whitespace-nowrap text-muted`}>{timeAgo(c.createdAt)}</td>
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
