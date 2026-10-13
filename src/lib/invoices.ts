import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { sendMail } from "@/lib/notify";
import { invoiceToken } from "@/lib/refs";
import { formatMoney } from "@/lib/utils";
import { FOUNDER, publicPhone, siteUrl, type SiteSettings } from "@/config/site";
import { balanceCents, computeTotals, isOverdue, nextInvoiceNumber, statusForPaid, type InvoiceState } from "@/lib/invoice-math";
import { fmtDate, type InvoiceView } from "@/lib/invoice-view";

/**
 * Invoices: created from an order (automatically) or by hand in the admin,
 * emailed to the customer with the PDF attached, paid off with recorded
 * payments. Every change is written to the audit log by the admin actions.
 */

export type InvoiceInput = {
  customerId: string;
  orderId?: string | null;
  poNumber?: string | null;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  bill: { name: string; company?: string | null; email: string; phone?: string | null; address?: string | null };
  shipVia?: string | null;
  deliveryTime?: string | null;
  items: { description: string; details?: string | null; quantity: number; unitCents: number }[];
  discountCents?: number;
  shippingCents?: number;
  taxBasisPoints?: number;
  paymentTerms: string;
  notes?: string | null;
};

const withAll = { items: { orderBy: { position: "asc" } }, payments: { orderBy: { receivedAt: "asc" } }, order: { select: { orderNumber: true } } } satisfies Prisma.InvoiceInclude;
export type FullInvoice = Prisma.InvoiceGetPayload<{ include: typeof withAll }>;

/** Signed link to the invoice PDF (opens in the browser; add &download=1 to save). */
export const invoicePath = (number: string) => `/invoice/${number}?t=${invoiceToken(number)}`;
export const invoiceLink = (number: string) => `${siteUrl}${invoicePath(number)}`;

function itemRows(items: InvoiceInput["items"]) {
  return items.map((i, position) => ({
    position,
    description: i.description.trim(),
    details: i.details?.trim() || null,
    quantity: Math.round(i.quantity),
    unitCents: Math.round(i.unitCents),
    totalCents: Math.round(i.quantity) * Math.round(i.unitCents),
  }));
}

function scalars(input: InvoiceInput) {
  const t = computeTotals(input.items, { discountCents: input.discountCents, shippingCents: input.shippingCents, taxBasisPoints: input.taxBasisPoints });
  return {
    customerId: input.customerId,
    orderId: input.orderId ?? null,
    poNumber: input.poNumber?.trim() || null,
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    currency: input.currency,
    billName: input.bill.name.trim(),
    billCompany: input.bill.company?.trim() || null,
    billEmail: input.bill.email.trim().toLowerCase(),
    billPhone: input.bill.phone?.trim() || null,
    billAddress: input.bill.address?.trim() || null,
    shipVia: input.shipVia?.trim() || null,
    deliveryTime: input.deliveryTime?.trim() || null,
    ...t,
    taxBasisPoints: Math.max(0, Math.round(input.taxBasisPoints ?? 0)),
    paymentTerms: input.paymentTerms.trim(),
    notes: input.notes?.trim() || null,
  };
}

/** Next free number for the year; retried on the (rare) clash with a parallel create. */
async function issueNumber(year: number) {
  const last = await db.invoice.findFirst({ where: { invoiceNumber: { startsWith: `INV-${year}-` } }, orderBy: { invoiceNumber: "desc" }, select: { invoiceNumber: true } });
  return nextInvoiceNumber(year, last?.invoiceNumber ?? null);
}

export async function createInvoice(input: InvoiceInput, createdBy: string | null) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.invoice.create({
        data: { ...scalars(input), invoiceNumber: await issueNumber(input.issueDate.getFullYear()), createdBy, items: { create: itemRows(input.items) } },
      });
    } catch (e) {
      const clash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!clash || attempt >= 4) throw e;
    }
  }
}

export async function updateInvoice(id: string, input: InvoiceInput) {
  const current = await db.invoice.findUniqueOrThrow({ where: { id }, select: { status: true, paidCents: true } });
  const data = scalars(input);
  const status = statusForPaid(current.status as InvoiceState, data.totalCents, current.paidCents);
  return db.$transaction([
    db.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    db.invoice.update({ where: { id }, data: { ...data, status, paidAt: status === "PAID" ? new Date() : null, items: { create: itemRows(input.items) } } }),
  ]);
}

/** Bill-to address as one block of text. */
function addressFromOrder(o: { shipLine1: string; shipLine2: string | null; shipCity: string; shipRegion: string | null; shipPostal: string | null; shipCountry: string }) {
  return [o.shipLine1, o.shipLine2, [o.shipCity, o.shipRegion, o.shipPostal].filter(Boolean).join(" "), o.shipCountry].filter(Boolean).join("\n");
}

/**
 * The order's invoice, created as a draft the first time it's needed (when an
 * order is placed or created from a quote). The team checks it, adds freight
 * or extra lines, and sends it.
 */
export async function draftInvoiceForOrder(orderId: string, createdBy: string | null) {
  const existing = await db.invoice.findFirst({ where: { orderId, status: { not: "VOID" } }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;
  const [order, settings] = await Promise.all([db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } }), getSettings()]);
  const issueDate = new Date();
  return createInvoice(
    {
      customerId: order.customerId,
      orderId: order.id,
      issueDate,
      dueDate: new Date(issueDate.getTime() + settings.invoice.dueDays * 86_400_000),
      currency: order.currency,
      bill: { name: order.contactName, company: order.company, email: order.contactEmail, phone: order.contactPhone, address: addressFromOrder(order) },
      items: order.items.map((i) => ({
        description: i.nameSnapshot,
        details: [i.isSample ? "Pre-production sample" : null, i.size ? `Size ${i.size}` : null, i.color, i.skuSnapshot !== "CUSTOM" ? `SKU ${i.skuSnapshot}` : null].filter(Boolean).join(" · ") || null,
        quantity: i.quantity,
        unitCents: i.unitCents,
      })),
      discountCents: order.discountCents,
      shippingCents: order.shippingCents,
      paymentTerms: settings.invoice.paymentTerms,
      notes: settings.invoice.notes || null,
    },
    createdBy,
  );
}

export async function loadInvoice(where: Prisma.InvoiceWhereUniqueInput) {
  return db.invoice.findUnique({ where, include: withAll });
}

function companyBlock(s: SiteSettings): InvoiceView["company"] {
  const phone = publicPhone(s.contact.phone);
  return {
    name: s.brand.name,
    tagline: "We make to your wishes",
    founder: `${FOUNDER.name} · ${FOUNDER.title}`,
    address: [s.contact.addressLine, s.contact.city, s.contact.country].filter(Boolean).join(", "),
    email: s.contact.email,
    phone: phone?.number ?? "",
    website: siteUrl.replace(/^https?:\/\//, ""),
    taxId: s.invoice.taxId,
  };
}

export function toView(inv: FullInvoice, s: SiteSettings): InvoiceView {
  return {
    number: inv.invoiceNumber,
    status: inv.status,
    overdue: isOverdue(inv),
    issueDate: fmtDate(inv.issueDate),
    dueDate: inv.dueDate ? fmtDate(inv.dueDate) : null,
    poNumber: inv.poNumber,
    currency: inv.currency,
    company: companyBlock(s),
    bill: { name: inv.billName, company: inv.billCompany, email: inv.billEmail, phone: inv.billPhone, address: inv.billAddress },
    origin: [s.contact.city, s.contact.country].filter(Boolean).join(", ") || "Sialkot, Pakistan",
    shipVia: inv.shipVia,
    deliveryTime: inv.deliveryTime,
    orderNumber: inv.order?.orderNumber ?? null,
    items: inv.items.map((i) => ({ description: i.description, details: i.details, quantity: i.quantity, unitCents: i.unitCents, totalCents: i.totalCents })),
    subtotalCents: inv.subtotalCents,
    discountCents: inv.discountCents,
    shippingCents: inv.shippingCents,
    taxBasisPoints: inv.taxBasisPoints,
    taxCents: inv.taxCents,
    totalCents: inv.totalCents,
    paidCents: inv.paidCents,
    balanceCents: balanceCents(inv),
    paymentTerms: inv.paymentTerms,
    bankDetails: s.invoice.bankDetails,
    notes: inv.notes,
  };
}

/** Email the invoice with its PDF attached, and mark a draft as sent. */
export async function sendInvoiceEmail(invoiceId: string, opts: { message?: string } = {}) {
  const [inv, settings] = await Promise.all([loadInvoice({ id: invoiceId }), getSettings()]);
  if (!inv) throw new Error("Invoice not found");
  if (inv.status === "VOID") return { status: "failed" as const, error: "This invoice is void." };
  const view = toView(inv, settings);
  const { renderInvoicePdf } = await import("@/lib/pdf/invoice-pdf");
  const pdf = await renderInvoicePdf(view);
  const money = (c: number) => formatMoney(c, inv.currency);

  const result = await sendMail({
    to: inv.billEmail,
    kind: "invoice",
    invoiceId: inv.id,
    orderId: inv.orderId,
    replyTo: settings.contact.email || null,
    subject: `Invoice ${inv.invoiceNumber} — ${money(inv.totalCents)} — ${settings.brand.name}`,
    text: [
      `Dear ${inv.billName},`,
      "",
      opts.message?.trim() || `Please find attached invoice ${inv.invoiceNumber}${view.orderNumber ? ` for order ${view.orderNumber}` : ""}.`,
      "",
      `Invoice: ${inv.invoiceNumber}`,
      `Amount due: ${money(view.balanceCents)}`,
      ...(view.dueDate ? [`Due date: ${view.dueDate}`] : []),
      `Payment terms: ${inv.paymentTerms}`,
      ...(settings.invoice.bankDetails ? ["", "Bank details:", settings.invoice.bankDetails] : []),
      "",
      `View or download your invoice: ${invoiceLink(inv.invoiceNumber)}`,
      "",
      "Please reply to this email with your payment confirmation or any question.",
      "",
      settings.brand.name,
      [settings.contact.email, view.company.phone].filter(Boolean).join(" · "),
    ].join("\n"),
    attachments: [{ filename: `${inv.invoiceNumber}.pdf`, content: pdf, contentType: "application/pdf" }],
  });

  if (result.status === "sent" && inv.status === "DRAFT") {
    await db.invoice.update({ where: { id: inv.id }, data: { status: statusForPaid("SENT", inv.totalCents, inv.paidCents), sentAt: new Date() } });
  } else if (result.status === "sent") {
    await db.invoice.update({ where: { id: inv.id }, data: { sentAt: new Date() } });
  }
  return result;
}

/** Recompute paid total + status after a payment is added or removed; mirror it on the order. */
export async function syncPayments(invoiceId: string, actorEmail: string | null) {
  const inv = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: true } });
  const paidCents = inv.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const base: InvoiceState = inv.status === "DRAFT" && paidCents > 0 ? "SENT" : (inv.status as InvoiceState);
  const status = statusForPaid(base, inv.totalCents, paidCents);
  await db.invoice.update({ where: { id: invoiceId }, data: { paidCents, status, paidAt: status === "PAID" ? (inv.paidAt ?? new Date()) : null } });

  if (inv.orderId) {
    const paymentStatus = status === "PAID" ? "PAID" : status === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID";
    const order = await db.order.findUnique({ where: { id: inv.orderId }, select: { paymentStatus: true } });
    if (order && order.paymentStatus !== paymentStatus) {
      await db.order.update({
        where: { id: inv.orderId },
        data: { paymentStatus, events: { create: { kind: "payment", fromValue: order.paymentStatus, toValue: paymentStatus, note: `From invoice ${inv.invoiceNumber}`, actorEmail } } },
      });
    }
  }
  return status;
}
