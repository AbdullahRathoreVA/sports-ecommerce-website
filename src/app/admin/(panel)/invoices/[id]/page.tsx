import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card } from "@/components/admin/ui";
import { invoicePath } from "@/lib/invoices";
import { balanceCents, isOverdue } from "@/lib/invoice-math";
import { STATUS_LABEL, fmtDate } from "@/lib/invoice-view";
import { formatMoney } from "@/lib/utils";
import { InvoiceEditor, RecordPayment, RemovePayment, SendInvoice, VoidInvoice } from "./controls";

export const metadata: Metadata = { title: "Invoice" };

const TONE = { DRAFT: "neutral", SENT: "info", PARTIALLY_PAID: "warn", PAID: "good", VOID: "neutral" } as const;
const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
const amount = (c: number) => (c / 100).toFixed(2).replace(/\.00$/, "");

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("manageOrders");
  const { id } = await params;
  const inv = await db.invoice.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } }, payments: { orderBy: { receivedAt: "asc" } }, emails: { orderBy: { createdAt: "desc" } }, order: { select: { id: true, orderNumber: true } }, customer: { select: { id: true } } },
  });
  if (!inv) notFound();
  const overdue = isOverdue(inv);
  const balance = balanceCents(inv);
  const pdf = invoicePath(inv.invoiceNumber);
  const locked = inv.status === "VOID";

  return (
    <>
      <Link href="/admin/invoices" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All invoices
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-medium sm:text-3xl">{inv.invoiceNumber}</h1>
        <Badge tone={overdue ? "bad" : TONE[inv.status]}>{overdue ? "Overdue" : STATUS_LABEL[inv.status]}</Badge>
        <span className="text-sm text-subtle">
          {formatMoney(inv.totalCents, inv.currency)} · balance {formatMoney(balance, inv.currency)}
        </span>
        <span className="ml-auto flex gap-2">
          {/* Drafts aren't public yet, so the admin opens the signed link only once sent; preview uses the same renderer. */}
          <a href={inv.status === "DRAFT" ? `/api/admin/invoices/${inv.id}/pdf` : pdf} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/[0.08] px-4 text-sm font-semibold hover:bg-white/[0.12]">
            <FileText className="h-4 w-4" aria-hidden /> Open PDF
          </a>
          <a href={inv.status === "DRAFT" ? `/api/admin/invoices/${inv.id}/pdf?download=1` : `${pdf}&download=1`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/[0.08] px-4 text-sm font-semibold hover:bg-white/[0.12]">
            <Download className="h-4 w-4" aria-hidden /> Download
          </a>
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card title={locked ? "Invoice (void)" : "Invoice details — edit and save"}>
          <InvoiceEditor
            id={inv.id}
            currency={inv.currency}
            locked={locked}
            initial={{
              poNumber: inv.poNumber ?? "",
              issueDate: ymd(inv.issueDate),
              dueDate: ymd(inv.dueDate),
              billName: inv.billName,
              billCompany: inv.billCompany ?? "",
              billEmail: inv.billEmail,
              billPhone: inv.billPhone ?? "",
              billAddress: inv.billAddress ?? "",
              shipVia: inv.shipVia ?? "",
              deliveryTime: inv.deliveryTime ?? "",
              items: inv.items.map((i) => ({ description: i.description, details: i.details ?? "", quantity: String(i.quantity), unit: amount(i.unitCents) })),
              shipping: amount(inv.shippingCents),
              discount: amount(inv.discountCents),
              taxPercent: String(inv.taxBasisPoints / 100),
              paymentTerms: inv.paymentTerms,
              notes: inv.notes ?? "",
            }}
          />
        </Card>

        <div className="space-y-6">
          {!locked && (
            <Card title={inv.sentAt ? `Sent ${fmtDate(inv.sentAt)}` : "Send to client"}>
              <SendInvoice id={inv.id} to={inv.billEmail} sent={Boolean(inv.sentAt)} />
            </Card>
          )}
          <Card title="Payments">
            {inv.payments.length > 0 && (
              <ul className="mb-4 space-y-2 text-sm">
                {inv.payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-2 rounded-lg bg-white/[0.04] p-2.5">
                    <div>
                      <p className="font-semibold">{formatMoney(p.amountCents, inv.currency)} · {p.method}</p>
                      <p className="text-xs text-subtle">
                        {fmtDate(p.receivedAt)}
                        {p.reference ? ` · ${p.reference}` : ""}
                        {p.recordedBy ? ` · ${p.recordedBy}` : ""}
                      </p>
                    </div>
                    <RemovePayment paymentId={p.id} />
                  </li>
                ))}
              </ul>
            )}
            {!locked && balance > 0 ? <RecordPayment id={inv.id} balance={amount(balance)} /> : <p className="text-sm text-muted">{locked ? "Void — no payments." : "Fully paid ✓"}</p>}
          </Card>
          <Card title="Links">
            <ul className="space-y-2 text-sm">
              {inv.order && (
                <li>
                  <Link href={`/admin/orders/${inv.order.id}`} className="text-accent hover:underline">Order {inv.order.orderNumber} →</Link>
                </li>
              )}
              <li>
                <Link href={`/admin/customers/${inv.customer.id}`} className="text-accent hover:underline">Client history →</Link>
              </li>
            </ul>
            {inv.emails.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-subtle">
                {inv.emails.map((m) => (
                  <li key={m.id}>
                    {fmtDate(m.createdAt)} · email {m.status} → {m.toAddress}
                    {m.error ? ` (${m.error})` : ""}
                  </li>
                ))}
              </ul>
            )}
            {!locked && <div className="mt-4 border-t hairline pt-3"><VoidInvoice id={inv.id} /></div>}
          </Card>
        </div>
      </div>
    </>
  );
}
