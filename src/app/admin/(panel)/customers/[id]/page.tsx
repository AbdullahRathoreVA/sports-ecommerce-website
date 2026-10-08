import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, LEAD_TONE, ORDER_TONE, humanise, StatTile, th, td } from "@/components/admin/ui";
import { countryLabel } from "@/lib/admin/insights";
import { formatMoney } from "@/lib/utils";
import { revokePortalSessions, verifyPortalEmail } from "../actions";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("viewCustomers");
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, select: { id: true, orderNumber: true, status: true, totalCents: true, currency: true, createdAt: true, _count: { select: { items: true } } } },
      leads: { orderBy: { createdAt: "desc" }, select: { id: true, leadNumber: true, status: true, productName: true, quantity: true, createdAt: true } },
    },
  });
  if (!customer) notFound();
  const emails = await db.emailLog.findMany({
    where: { OR: [{ orderId: { in: customer.orders.map((o) => o.id) } }, { leadId: { in: customer.leads.map((l) => l.id) } }] },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const valid = customer.orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
  const ltv = valid.reduce((n, o) => n + o.totalCents, 0);
  const won = customer.leads.filter((l) => l.status === "WON").length;

  return (
    <>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All customers
      </Link>
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">{customer.company ?? customer.name}</h1>
          {customer.isDemo && <Badge>demo</Badge>}
        </div>
        <p className="mt-1 text-muted">
          {customer.company ? `${customer.name} · ` : ""}
          {customer.country ? countryLabel(customer.country) : "Country not given"} · customer since {customer.createdAt.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <a href={`mailto:${customer.email}`} className="inline-flex items-center gap-1.5 text-accent hover:underline"><Mail className="h-4 w-4" aria-hidden /> {customer.email}</a>
          {customer.phone && <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 text-muted hover:text-fg"><Phone className="h-4 w-4" aria-hidden /> {customer.phone}</a>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3 text-sm ring-1 ring-white/10">
          <span className="font-semibold">Client portal:</span>
          {!customer.passwordHash ? (
            <span className="text-muted">no account yet</span>
          ) : (
            <>
              <Badge tone={customer.emailVerifiedAt ? "good" : "warn"}>{customer.emailVerifiedAt ? "email verified" : "email not verified"}</Badge>
              <span className="text-muted">
                joined {customer.portalSince?.toLocaleDateString("en-GB", { dateStyle: "medium" }) ?? "—"}
                {customer.lastLoginAt ? ` · last login ${customer.lastLoginAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""}
              </span>
              {!customer.emailVerifiedAt && (
                <form action={verifyPortalEmail.bind(null, customer.id)}>
                  <button type="submit" className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white" title="Only after confirming this is really the customer (phone / WhatsApp)">
                    Mark email verified
                  </button>
                </form>
              )}
              <form action={revokePortalSessions.bind(null, customer.id)}>
                <button type="submit" className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
                  Sign out all devices
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Lifetime value" value={formatMoney(ltv)} hint="All time" />
        <StatTile label="Orders" value={String(customer.orders.length)} hint="All time" />
        <StatTile label="Enquiries" value={String(customer.leads.length)} hint="All time" />
        <StatTile label="Quotes won" value={String(won)} hint="All time" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Orders">
          {customer.orders.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className={th}>Order</th><th className={th}>Status</th><th className={`${th} text-right`}>Total</th><th className={th}>Date</th></tr></thead>
                <tbody>
                  {customer.orders.map((o) => (
                    <tr key={o.id} className="border-t hairline">
                      <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-mono hover:text-accent">{o.orderNumber}</Link></td>
                      <td className={td}><Badge tone={ORDER_TONE[o.status]}>{humanise(o.status)}</Badge></td>
                      <td className={`${td} text-right tabular-nums`}>{formatMoney(o.totalCents, o.currency)}</td>
                      <td className={`${td} text-muted`}>{o.createdAt.toLocaleDateString("en-GB")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Enquiries">
          {customer.leads.length === 0 ? (
            <p className="text-sm text-muted">No enquiries yet.</p>
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full">
                <thead><tr><th className={th}>Lead</th><th className={th}>Product</th><th className={th}>Stage</th><th className={th}>Date</th></tr></thead>
                <tbody>
                  {customer.leads.map((l) => (
                    <tr key={l.id} className="border-t hairline">
                      <td className={td}><Link href={`/admin/leads/${l.id}`} className="font-mono hover:text-accent">{l.leadNumber}</Link></td>
                      <td className={`${td} text-muted`}>{l.productName ?? "General"}{l.quantity ? ` × ${l.quantity}` : ""}</td>
                      <td className={td}><Badge tone={LEAD_TONE[l.status]}>{humanise(l.status)}</Badge></td>
                      <td className={`${td} text-muted`}>{l.createdAt.toLocaleDateString("en-GB")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Email record" className="xl:col-span-2">
          {emails.length === 0 ? (
            <p className="text-sm text-muted">No emails yet.</p>
          ) : (
            <ul className="divide-y hairline">
              {emails.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="font-medium">{m.subject}</span>
                    <span className="ml-2 text-xs text-subtle">{humanise(m.kind)}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-subtle">
                    <Badge tone={m.status === "sent" ? "good" : m.status === "failed" ? "bad" : "neutral"}>{m.status}</Badge>
                    {m.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
