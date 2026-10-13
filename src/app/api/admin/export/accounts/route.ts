import { NextResponse } from "next/server";
import { AuthError, audit, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildWorkbook, deFormula, type Sheet } from "@/lib/xlsx";
import { balanceCents, isOverdue } from "@/lib/invoice-math";
import { STATUS_LABEL } from "@/lib/invoice-view";

/**
 * Every client's account in one Excel file (idea from the al-amin-al-tajir CRM
 * export): Summary, Clients, Invoices, Payments, Orders. Money in dollars.
 */
const usd = (c: number) => Math.round(c) / 100;
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const t = (v: string | null | undefined) => deFormula(v ?? "") ?? "";

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin("manageOrders");
  } catch (e) {
    if (e instanceof AuthError) return new NextResponse("Not allowed", { status: e.status });
    throw e;
  }
  const [customers, invoices, payments, orders] = await Promise.all([
    db.customer.findMany({ where: { isDemo: false }, include: { _count: { select: { orders: true, leads: true } } }, orderBy: { createdAt: "asc" } }),
    db.invoice.findMany({ where: { isDemo: false }, include: { order: { select: { orderNumber: true } } }, orderBy: { issueDate: "asc" } }),
    db.invoicePayment.findMany({ include: { invoice: { select: { invoiceNumber: true, billName: true, billCompany: true, isDemo: true } } }, orderBy: { receivedAt: "asc" } }),
    db.order.findMany({ where: { isDemo: false }, orderBy: { createdAt: "asc" } }),
  ]);
  const live = invoices.filter((i) => i.status !== "VOID" && i.status !== "DRAFT");
  const byCustomer = new Map<string, typeof live>();
  for (const i of live) byCustomer.set(i.customerId, [...(byCustomer.get(i.customerId) ?? []), i]);
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const clientRows = customers.map((c) => {
    const inv = byCustomer.get(c.id) ?? [];
    return {
      name: t(c.name), company: t(c.company), country: t(c.country), email: t(c.email), phone: t(c.phone),
      orders: c._count.orders, enquiries: c._count.leads, invoices: inv.length,
      invoiced: usd(sum(inv.map((i) => i.totalCents))), paid: usd(sum(inv.map((i) => i.paidCents))), balance: usd(sum(inv.map(balanceCents))),
      last: day(inv.at(-1)?.issueDate ?? null), since: day(c.createdAt),
    };
  });
  const invoiced = sum(live.map((i) => i.totalCents));
  const paid = sum(live.map((i) => i.paidCents));

  const sheets: Sheet[] = [
    {
      name: "Summary", accent: "slate", caption: `Exported ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
      columns: [{ header: "Figure", key: "k", width: 30 }, { header: "Value", key: "v", format: "number", width: 18 }],
      rows: [
        { k: "Clients", v: customers.length },
        { k: "Orders", v: orders.length },
        { k: "Invoices issued", v: live.length },
        { k: "Total invoiced (USD)", v: usd(invoiced) },
        { k: "Total received (USD)", v: usd(paid) },
        { k: "Outstanding (USD)", v: usd(invoiced - paid) },
        { k: "Overdue invoices", v: live.filter((i) => isOverdue(i)).length },
      ],
    },
    {
      name: "Clients", accent: "violet",
      columns: [
        { header: "Client", key: "name" }, { header: "Company", key: "company" }, { header: "Country", key: "country", width: 14 }, { header: "Email", key: "email", width: 28 }, { header: "Phone", key: "phone", width: 16 },
        { header: "Orders", key: "orders", format: "integer" }, { header: "Enquiries", key: "enquiries", format: "integer" }, { header: "Invoices", key: "invoices", format: "integer" },
        { header: "Invoiced", key: "invoiced", format: "money" }, { header: "Paid", key: "paid", format: "money" }, { header: "Balance", key: "balance", format: "money" },
        { header: "Last invoice", key: "last", format: "date" }, { header: "Client since", key: "since", format: "date" },
      ],
      rows: clientRows,
      totals: { name: "Total", invoiced: usd(invoiced), paid: usd(paid), balance: usd(invoiced - paid) },
    },
    {
      name: "Invoices", accent: "ember",
      columns: [
        { header: "Invoice", key: "no", width: 15 }, { header: "Status", key: "status", width: 16 }, { header: "Client", key: "client" }, { header: "Email", key: "email", width: 26 }, { header: "Order", key: "order", width: 16 },
        { header: "Date", key: "date", format: "date" }, { header: "Due", key: "due", format: "date" }, { header: "Currency", key: "cur", width: 9 },
        { header: "Subtotal", key: "sub", format: "money" }, { header: "Shipping", key: "ship", format: "money" }, { header: "Discount", key: "disc", format: "money" }, { header: "Tax", key: "tax", format: "money" },
        { header: "Total", key: "total", format: "money" }, { header: "Paid", key: "paid", format: "money" }, { header: "Balance", key: "bal", format: "money" },
      ],
      rows: invoices.map((i) => ({
        no: i.invoiceNumber, status: isOverdue(i) ? "Overdue" : STATUS_LABEL[i.status], client: t(i.billCompany ?? i.billName), email: t(i.billEmail), order: i.order?.orderNumber ?? "",
        date: day(i.issueDate), due: day(i.dueDate), cur: i.currency, sub: usd(i.subtotalCents), ship: usd(i.shippingCents), disc: usd(i.discountCents), tax: usd(i.taxCents),
        total: usd(i.totalCents), paid: usd(i.paidCents), bal: i.status === "VOID" ? 0 : usd(balanceCents(i)),
      })),
    },
    {
      name: "Payments", accent: "teal",
      columns: [
        { header: "Date", key: "date", format: "date" }, { header: "Invoice", key: "no", width: 15 }, { header: "Client", key: "client" }, { header: "Amount", key: "amount", format: "money" },
        { header: "Method", key: "method", width: 16 }, { header: "Reference", key: "ref", width: 22 }, { header: "Recorded by", key: "by", width: 24 },
      ],
      rows: payments.filter((p) => !p.invoice.isDemo).map((p) => ({ date: day(p.receivedAt), no: p.invoice.invoiceNumber, client: t(p.invoice.billCompany ?? p.invoice.billName), amount: usd(p.amountCents), method: t(p.method), ref: t(p.reference), by: t(p.recordedBy) })),
      totals: { date: "Total", amount: usd(sum(payments.filter((p) => !p.invoice.isDemo).map((p) => p.amountCents))) },
    },
    {
      name: "Orders", accent: "amber",
      columns: [
        { header: "Order", key: "no", width: 16 }, { header: "Date", key: "date", format: "date" }, { header: "Client", key: "client" }, { header: "Email", key: "email", width: 26 }, { header: "Country", key: "country", width: 14 },
        { header: "Status", key: "status", width: 14 }, { header: "Payment", key: "pay", width: 14 }, { header: "Total", key: "total", format: "money" },
      ],
      rows: orders.map((o) => ({ no: o.orderNumber, date: day(o.createdAt), client: t(o.company ?? o.contactName), email: t(o.contactEmail), country: t(o.shipCountry), status: o.status, pay: o.paymentStatus, total: usd(o.totalCents) })),
    },
  ];
  await audit(admin, "export.accounts", "Invoice", null, { clients: customers.length, invoices: invoices.length });
  const file = buildWorkbook(sheets);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="alrobel-accounts-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
