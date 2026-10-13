import type { Metadata } from "next";
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, StatTile } from "@/components/admin/ui";
import { formatMoney } from "@/lib/utils";
import { balanceCents, isOverdue } from "@/lib/invoice-math";
import { STATUS_LABEL, fmtDate } from "@/lib/invoice-view";
import { mailProvider } from "@/lib/notify";

export const metadata: Metadata = { title: "Invoices" };

const FILTERS = [
  { key: "", label: "All" },
  { key: "open", label: "Awaiting payment" },
  { key: "overdue", label: "Overdue" },
  { key: "PAID", label: "Paid" },
  { key: "DRAFT", label: "Drafts" },
  { key: "VOID", label: "Void" },
];

const TONE = { DRAFT: "neutral", SENT: "info", PARTIALLY_PAID: "warn", PAID: "good", VOID: "neutral" } as const;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdminPage("manageOrders");
  const { status = "", q = "" } = await searchParams;
  const all = await db.invoice.findMany({ orderBy: { issueDate: "desc" }, include: { order: { select: { orderNumber: true } } }, take: 1000 });

  const live = all.filter((i) => i.status !== "VOID" && i.status !== "DRAFT");
  const invoiced = live.reduce((s, i) => s + i.totalCents, 0);
  const received = live.reduce((s, i) => s + i.paidCents, 0);
  const outstanding = live.reduce((s, i) => s + balanceCents(i), 0);
  const overdue = live.filter((i) => isOverdue(i));

  const term = q.trim().toLowerCase();
  const rows = all.filter((i) => {
    if (status === "open" && !(i.status === "SENT" || i.status === "PARTIALLY_PAID")) return false;
    if (status === "overdue" && !isOverdue(i)) return false;
    if (["PAID", "DRAFT", "VOID"].includes(status) && i.status !== status) return false;
    if (term && ![i.invoiceNumber, i.billName, i.billCompany ?? "", i.billEmail, i.order?.orderNumber ?? ""].some((v) => v.toLowerCase().includes(term))) return false;
    return true;
  });
  const sending = mailProvider();

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted">Created from orders (website or Leads → Create order). Open one to add freight or lines, send it, and record payments.</p>
        </div>
        <a href="/api/admin/export/accounts" className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500">
          <FileSpreadsheet className="h-4 w-4" aria-hidden /> Export to Excel
        </a>
      </div>
      {!sending && (
        <p className="mb-5 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200 ring-1 ring-amber-500/30">
          Emailing invoices is off until the Zoho app password for info@ is added in Vercel (SMTP_PASS). Until then use “Open PDF” on an invoice and send it yourself.
        </p>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Invoiced" value={formatMoney(invoiced)} hint={`${live.length} invoices`} />
        <StatTile label="Received" value={formatMoney(received)} />
        <StatTile label="Outstanding" value={formatMoney(outstanding)} />
        <StatTile label="Overdue" value={formatMoney(overdue.reduce((s, i) => s + balanceCents(i), 0))} hint={`${overdue.length} invoices`} />
      </div>
      <Card>
        <form className="mb-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Link key={f.key} href={`/admin/invoices${f.key ? `?status=${f.key}` : ""}`} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === f.key ? "bg-accent text-white" : "bg-white/[0.06] text-muted hover:text-fg"}`}>
              {f.label}
            </Link>
          ))}
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Search client, email, invoice or order no." className="ml-auto h-9 w-full rounded-lg bg-white/[0.06] px-3 text-sm sm:w-72" />
        </form>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No invoices yet. They appear here automatically when an order is placed or created from a quote.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-subtle">
                <tr>
                  <th className="py-2">Invoice</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Due</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Balance</th>
                  <th className="pl-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y hairline">
                {rows.map((i) => (
                  <tr key={i.id} className="hover:bg-white/[0.03]">
                    <td className="py-2.5">
                      <Link href={`/admin/invoices/${i.id}`} className="font-mono font-medium text-accent hover:underline">{i.invoiceNumber}</Link>
                      {i.order && <p className="font-mono text-xs text-subtle">{i.order.orderNumber}</p>}
                    </td>
                    <td>
                      <p className="font-medium">{i.billCompany ?? i.billName}</p>
                      <p className="text-xs text-subtle">{i.billEmail}</p>
                    </td>
                    <td className="text-muted">{fmtDate(i.issueDate)}</td>
                    <td className={isOverdue(i) ? "font-semibold text-red-400" : "text-muted"}>{i.dueDate ? fmtDate(i.dueDate) : "—"}</td>
                    <td className="text-right tabular-nums">{formatMoney(i.totalCents, i.currency)}</td>
                    <td className="text-right font-semibold tabular-nums">{i.status === "VOID" ? "—" : formatMoney(balanceCents(i), i.currency)}</td>
                    <td className="pl-4">
                      <Badge tone={isOverdue(i) ? "bad" : TONE[i.status]}>{isOverdue(i) ? "Overdue" : STATUS_LABEL[i.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
