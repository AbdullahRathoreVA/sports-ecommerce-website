"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { emailFromTeam, emailOrderReceived } from "@/lib/emails";
import { getSettings } from "@/lib/settings";
import { newOrderNumber } from "@/lib/refs";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageLeads");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "NEGOTIATING", "WON", "LOST"]),
  assignedToId: z.string().max(40).nullable(),
});

export async function updateLead(leadId: string, input: z.input<typeof schema>): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to change leads." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { status: true, assignedToId: true } });
  if (!lead) return { ok: false, error: "Lead not found." };
  if (parsed.data.assignedToId) {
    const exists = await db.adminUser.findFirst({ where: { id: parsed.data.assignedToId, active: true }, select: { id: true } });
    if (!exists) return { ok: false, error: "That team member isn't active." };
  }
  await db.lead.update({ where: { id: leadId }, data: parsed.data });
  const notes: string[] = [];
  if (lead.status !== parsed.data.status) notes.push(`Status: ${lead.status} → ${parsed.data.status}`);
  if (lead.assignedToId !== parsed.data.assignedToId) notes.push("Assignment changed");
  if (notes.length) await db.leadNote.create({ data: { leadId, authorEmail: admin.email, body: notes.join(" · ") } });
  await audit(admin, "lead.update", "Lead", leadId, { from: lead, to: parsed.data });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true, message: "Lead updated." };
}

export async function addLeadNote(leadId: string, body: string): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const text = body.trim().slice(0, 4000);
  if (!text) return { ok: false, error: "Write a note first." };
  await db.leadNote.create({ data: { leadId, authorEmail: admin.email, body: text } });
  await audit(admin, "lead.note", "Lead", leadId);
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function emailLead(leadId: string, subject: string, body: string): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const s = subject.trim().slice(0, 200);
  const b = body.trim().slice(0, 10_000);
  if (!s || !b) return { ok: false, error: "Add a subject and a message." };
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, email: true, name: true, leadNumber: true, status: true } });
  if (!lead) return { ok: false, error: "Lead not found." };
  const r = await emailFromTeam({ to: lead.email, name: lead.name, subject: s, body: b, reference: lead.leadNumber, sender: admin.name, leadId });
  if (lead.status === "NEW") await db.lead.update({ where: { id: leadId }, data: { status: "CONTACTED" } });
  await audit(admin, "lead.email", "Lead", leadId, { subject: s, status: r.status });
  revalidatePath(`/admin/leads/${leadId}`);
  if (r.status === "failed") return { ok: false, error: "The email provider rejected the message — it is logged as failed. Check the address and try again." };
  return { ok: true, message: r.status === "sent" ? "Email sent and saved to the record." : "Saved to the record. Sending starts once the company email domain is connected." };
}

/**
 * Custom orders agreed by quote, email or WhatsApp become real orders here, so the
 * customer gets the same tracking page (status, QC photos, tracking number) as an
 * online order. The agreed price is entered by the team; nothing is calculated.
 */
const orderFromLeadSchema = z.object({
  productName: z.string().trim().min(2).max(120),
  quantity: z.coerce.number().int().min(1).max(1_000_000),
  unitPrice: z.coerce.number().min(0).max(100_000),
  paymentMethod: z.string().trim().min(1).max(40),
  shipLine1: z.string().trim().min(2).max(160),
  shipCity: z.string().trim().min(1).max(80),
  shipPostal: z.string().trim().max(20).optional(),
  shipCountry: z.string().trim().min(2).max(60),
  note: z.string().trim().max(2000).optional(),
});

export async function createOrderFromLead(leadId: string, input: z.input<typeof orderFromLeadSchema>): Promise<ActionResult & { orderId?: string }> {
  let admin;
  try {
    admin = await requireAdmin("manageOrders");
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: "You don't have permission to create orders." };
    throw e;
  }
  const parsed = orderFromLeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the order details." };
  const d = parsed.data;
  const lead = await db.lead.findUnique({ where: { id: leadId }, include: { product: { include: { images: { where: { source: { not: "retired" } }, orderBy: { position: "asc" }, take: 1 } } } } });
  if (!lead) return { ok: false, error: "Lead not found." };
  const settings = await getSettings();
  if (!settings.commerce.paymentMethods.some((m) => m.id === d.paymentMethod)) return { ok: false, error: "Choose a payment method." };

  const customer = lead.customerId
    ? { id: lead.customerId }
    : await db.customer.upsert({
        where: { email: lead.email },
        update: {},
        create: { email: lead.email, name: lead.name, phone: lead.phone, company: lead.company, country: d.shipCountry, source: "QUOTE" },
        select: { id: true },
      });
  const unitCents = Math.round(d.unitPrice * 100);
  const totalCents = unitCents * d.quantity;
  const req = (lead.requirements ?? {}) as Record<string, unknown>;
  const sizes = typeof req.sizeBreakdown === "string" ? req.sizeBreakdown : typeof req.sizes === "string" ? req.sizes : null;

  let order = null;
  for (let attempt = 0; attempt < 4 && !order; attempt++) {
    try {
      order = await db.order.create({
        data: {
          orderNumber: newOrderNumber(),
          customerId: customer.id,
          status: "CONFIRMED",
          paymentMethod: d.paymentMethod,
          subtotalCents: totalCents,
          totalCents,
          currency: settings.commerce.currency,
          contactName: lead.name,
          contactEmail: lead.email,
          contactPhone: lead.phone,
          company: lead.company,
          shipLine1: d.shipLine1,
          shipCity: d.shipCity,
          shipPostal: d.shipPostal || null,
          shipCountry: d.shipCountry,
          customerNote: [d.note, sizes ? `Sizes: ${sizes}` : null].filter(Boolean).join("\n") || null,
          isDemo: lead.isDemo,
          items: {
            create: [
              {
                productId: lead.productId,
                nameSnapshot: d.productName,
                skuSnapshot: lead.product?.sku ?? "CUSTOM",
                imageSnapshot: lead.product?.images[0]?.url ?? null,
                size: null,
                isSample: false,
                quantity: d.quantity,
                unitCents,
                totalCents,
              },
            ],
          },
          events: { create: [{ kind: "created", toValue: "CONFIRMED", note: `Custom order created from quote ${lead.leadNumber}`, actorEmail: admin.email }] },
        },
        include: { items: true },
      });
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  if (!order) return { ok: false, error: "Could not create the order — please try again." };

  await db.lead.update({ where: { id: leadId }, data: { status: "WON", customerId: customer.id } });
  await db.leadNote.create({ data: { leadId, authorEmail: admin.email, body: `Order ${order.orderNumber} created (${d.quantity} × ${d.productName}).` } });
  await audit(admin, "order.create_from_lead", "Order", order.id, { leadNumber: lead.leadNumber, totalCents });
  // Same confirmation + tracking link an online order gets (logged even before email sending is switched on).
  const mail = await emailOrderReceived(order).catch(() => ({ status: "failed" as const }));
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/orders");
  return {
    ok: true,
    orderId: order.id,
    message: `Order ${order.orderNumber} created${mail.status === "sent" ? " and the customer emailed their tracking link" : ""}.`,
  };
}
