import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Badge, ORDER_TONE, PAYMENT_TONE, humanise, Pagination, Empty, th, td } from "@/components/admin/ui";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };

const STATUSES = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "MANUFACTURING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
const PER_PAGE = 25;

type SP = { status?: string; q?: string; page?: string; data?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage("manageOrders");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status! : "ALL";
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.OrderWhereInput = {
    ...(status !== "ALL" ? { status: status as Prisma.OrderWhereInput["status"] } : {}),
    ...(sp.data === "real" ? { isDemo: false } : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { contactName: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { items: { select: { nameSnapshot: true, quantity: true }, take: 2 }, _count: { select: { items: true } } },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true, where: sp.data === "real" ? { isDemo: false } : {} }),
  ]);
  const countOf = (s: string) => (s === "ALL" ? counts.reduce((n, c) => n + c._count, 0) : counts.find((c) => c.status === s)?._count ?? 0);
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/orders${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Orders" description="Every order placed on the website. Prices are recalculated by the server — what you see here is what the customer agreed to." />
      <div className="scrollbar-none -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s === "ALL" ? undefined : s, page: undefined })} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium", status === s ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
            {s === "ALL" ? "All" : humanise(s)} <span className="font-mono text-xs opacity-60">{countOf(s)}</span>
          </Link>
        ))}
      </div>
      <form className="mb-4 flex gap-2" role="search">
        {status !== "ALL" && <input type="hidden" name="status" value={status} />}
        <label htmlFor="oq" className="sr-only">Search orders</label>
        <input id="oq" name="q" defaultValue={q} placeholder="Search order number, name, email or company" className="h-11 w-full max-w-md rounded-[var(--radius-control)] border hairline bg-surface px-3.5 text-[15px] outline-none focus:border-accent" />
        <button className="h-11 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink">Search</button>
      </form>

      {orders.length === 0 ? (
        <Empty title="No orders match" body="Try another status or search." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
          <table className="w-full min-w-[820px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Customer</th>
                <th className={th}>Items</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={th}>Status</th>
                <th className={th}>Payment</th>
                <th className={th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b hairline last:border-0 hover:bg-white/[0.02]">
                  <td className={td}>
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium text-fg hover:text-accent">
                      {o.orderNumber}
                    </Link>
                    {o.isDemo && <Badge className="ml-2">demo</Badge>}
                  </td>
                  <td className={td}>
                    <span className="block font-medium">{o.contactName}</span>
                    <span className="block text-xs text-subtle">{o.company ?? o.contactEmail}</span>
                  </td>
                  <td className={`${td} text-muted`}>
                    {o.items.map((i) => `${i.quantity}× ${i.nameSnapshot}`).join(", ")}
                    {o._count.items > 2 ? ` +${o._count.items - 2} more` : ""}
                  </td>
                  <td className={`${td} text-right font-semibold tabular-nums`}>{formatMoney(o.totalCents, o.currency)}</td>
                  <td className={td}>
                    <Badge tone={ORDER_TONE[o.status]}>{humanise(o.status)}</Badge>
                  </td>
                  <td className={td}>
                    <Badge tone={PAYMENT_TONE[o.paymentStatus]}>{humanise(o.paymentStatus)}</Badge>
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{o.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
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
