"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { draftInvoiceForOrder, sendInvoiceEmail, syncPayments, updateInvoice } from "@/lib/invoices";
import { parseMoney } from "@/lib/invoice-math";

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageOrders");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const refresh = (id?: string) => {
  revalidatePath("/admin/invoices");
  if (id) revalidatePath(`/admin/invoices/${id}`);
};

export async function invoiceForOrder(orderId: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to create invoices." };
  const inv = await draftInvoiceForOrder(orderId, admin.email);
  await audit(admin, "invoice.create", "Invoice", inv.id, { orderId });
  revalidatePath(`/admin/orders/${orderId}`);
  refresh(inv.id);
  return { ok: true, id: inv.id };
}

const money = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const c = parseMoney(v === "" ? 0 : v);
  if (c === null) ctx.addIssue({ code: "custom", message: "Enter amounts like 1250 or 1,250.50" });
  return c ?? 0;
});

const saveSchema = z.object({
  poNumber: z.string().trim().max(60).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  billName: z.string().trim().min(1, "Customer name is required").max(120),
  billCompany: z.string().trim().max(120).optional(),
  billEmail: z.string().trim().email("Enter the customer's email"),
  billPhone: z.string().trim().max(40).optional(),
  billAddress: z.string().trim().max(400).optional(),
  shipVia: z.string().trim().max(80).optional(),
  deliveryTime: z.string().trim().max(80).optional(),
  items: z
    .array(z.object({ description: z.string().trim().min(1, "Every line needs a description").max(160), details: z.string().trim().max(240).optional(), quantity: z.coerce.number().int().min(1).max(1_000_000), unit: money }))
    .min(1, "Add at least one line")
    .max(60),
  shipping: money,
  discount: money,
  taxPercent: z.coerce.number().min(0).max(100),
  paymentTerms: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(1000).optional(),
});

export async function saveInvoice(id: string, input: z.input<typeof saveSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the invoice." };
  const d = parsed.data;
  const inv = await db.invoice.findUnique({ where: { id }, select: { customerId: true, orderId: true, currency: true, status: true } });
  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.status === "VOID") return { ok: false, error: "A void invoice can't be edited." };
  await updateInvoice(id, {
    customerId: inv.customerId,
    orderId: inv.orderId,
    poNumber: d.poNumber,
    issueDate: new Date(`${d.issueDate}T12:00:00Z`),
    dueDate: d.dueDate ? new Date(`${d.dueDate}T12:00:00Z`) : null,
    currency: inv.currency,
    bill: { name: d.billName, company: d.billCompany, email: d.billEmail, phone: d.billPhone, address: d.billAddress },
    shipVia: d.shipVia,
    deliveryTime: d.deliveryTime,
    items: d.items.map((i) => ({ description: i.description, details: i.details, quantity: i.quantity, unitCents: i.unit })),
    shippingCents: d.shipping,
    discountCents: d.discount,
    taxBasisPoints: Math.round(d.taxPercent * 100),
    paymentTerms: d.paymentTerms,
    notes: d.notes,
  });
  await audit(admin, "invoice.update", "Invoice", id);
  refresh(id);
  return { ok: true, message: "Invoice saved." };
}

export async function sendInvoice(id: string, message: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const r = await sendInvoiceEmail(id, { message: message.slice(0, 2000) });
  await audit(admin, "invoice.send", "Invoice", id, { status: r.status });
  refresh(id);
  if (r.status === "sent") return { ok: true, message: "Invoice emailed with the PDF attached." };
  if (r.status === "skipped") return { ok: false, error: "Email sending isn't switched on yet (add the Zoho app password in Vercel). Use “Open PDF” and send it yourself for now." };
  return { ok: false, error: "The email could not be sent — check the address and try again." };
}

const paymentSchema = z.object({
  amount: money.refine((c) => c > 0, "Enter the amount received"),
  method: z.string().trim().min(1).max(40),
  reference: z.string().trim().max(80).optional(),
  receivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(240).optional(),
});

export async function addPayment(invoiceId: string, input: z.input<typeof paymentSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the payment." };
  const d = parsed.data;
  const inv = await db.invoice.findUnique({ where: { id: invoiceId }, select: { status: true } });
  if (!inv || inv.status === "VOID") return { ok: false, error: "This invoice can't take payments." };
  await db.invoicePayment.create({
    data: { invoiceId, amountCents: d.amount, method: d.method, reference: d.reference || null, receivedAt: new Date(`${d.receivedAt}T12:00:00Z`), note: d.note || null, recordedBy: admin.email },
  });
  const status = await syncPayments(invoiceId, admin.email);
  await audit(admin, "invoice.payment", "Invoice", invoiceId, { amountCents: d.amount });
  refresh(invoiceId);
  return { ok: true, message: status === "PAID" ? "Payment recorded — invoice is fully paid." : "Payment recorded." };
}

export async function removePayment(paymentId: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const p = await db.invoicePayment.delete({ where: { id: paymentId } }).catch(() => null);
  if (!p) return { ok: false, error: "Payment not found." };
  await syncPayments(p.invoiceId, admin.email);
  await audit(admin, "invoice.payment_remove", "Invoice", p.invoiceId, { amountCents: p.amountCents });
  refresh(p.invoiceId);
  return { ok: true };
}

export async function voidInvoice(id: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  await db.invoice.update({ where: { id }, data: { status: "VOID", voidedAt: new Date() } });
  await audit(admin, "invoice.void", "Invoice", id);
  refresh(id);
  return { ok: true, message: "Invoice voided." };
}
