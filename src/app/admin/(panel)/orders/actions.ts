"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { emailFromTeam, emailOrderStatus } from "@/lib/emails";
import { orderToken } from "@/lib/refs";
import { siteUrl } from "@/config/site";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "MANUFACTURING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  paymentStatus: z.enum(["UNPAID", "PENDING", "PAID", "PARTIALLY_PAID", "REFUNDED", "FAILED"]),
  shippingStatus: z.enum(["NOT_SHIPPED", "PACKED", "IN_TRANSIT", "DELIVERED", "RETURNED"]),
  carrier: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  internalNotes: z.string().trim().max(4000).optional(),
  notifyCustomer: z.boolean(),
});

async function guard() {
  try {
    return await requireAdmin("manageOrders");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

export async function updateOrder(orderId: string, input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to change orders." };
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false, error: "Order not found." };

  const changes: { kind: string; from: string; to: string }[] = [];
  if (order.status !== d.status) changes.push({ kind: "status", from: order.status, to: d.status });
  if (order.paymentStatus !== d.paymentStatus) changes.push({ kind: "payment", from: order.paymentStatus, to: d.paymentStatus });
  if (order.shippingStatus !== d.shippingStatus) changes.push({ kind: "shipping", from: order.shippingStatus, to: d.shippingStatus });
  const trackingChanged = (order.carrier ?? "") !== (d.carrier ?? "") || (order.trackingNumber ?? "") !== (d.trackingNumber ?? "");
  const notesChanged = (order.internalNotes ?? "") !== (d.internalNotes ?? "");
  if (!changes.length && !trackingChanged && !notesChanged) return { ok: true, message: "No changes." };

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      status: d.status,
      paymentStatus: d.paymentStatus,
      shippingStatus: d.shippingStatus,
      carrier: d.carrier || null,
      trackingNumber: d.trackingNumber || null,
      internalNotes: d.internalNotes || null,
      events: {
        create: [
          ...changes.map((c) => ({ kind: c.kind, fromValue: c.from, toValue: c.to, actorEmail: admin.email })),
          ...(trackingChanged && d.trackingNumber ? [{ kind: "note", note: `Tracking set: ${d.carrier ?? ""} ${d.trackingNumber}`.trim(), actorEmail: admin.email }] : []),
        ],
      },
    },
    include: { items: true },
  });

  await audit(admin, "order.update", "Order", orderId, {
    changes,
    ...(trackingChanged ? { tracking: { from: `${order.carrier ?? ""} ${order.trackingNumber ?? ""}`.trim(), to: `${d.carrier ?? ""} ${d.trackingNumber ?? ""}`.trim() } } : {}),
    ...(notesChanged ? { internalNotes: "updated" } : {}),
  });

  let emailNote = "";
  const statusChange = changes.find((c) => c.kind === "status");
  if (d.notifyCustomer && statusChange) {
    const r = await emailOrderStatus(updated, statusChange.to);
    emailNote = r ? (r.status === "sent" ? " Customer emailed." : r.status === "skipped" ? " Email logged (sending not configured yet)." : " Email failed — see timeline.") : "";
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { ok: true, message: `Order updated.${emailNote}` };
}

export async function addOrderNote(orderId: string, note: string): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const text = note.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "Write a note first." };
  await db.orderEvent.create({ data: { orderId, kind: "note", note: text, actorEmail: admin.email } });
  await audit(admin, "order.note", "Order", orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

const attachSchema = z.object({
  mediaId: z.string().min(10).max(40),
  kind: z.enum(["qc", "packing", "dispatch", "document", "other"]),
  caption: z.string().trim().max(200).optional(),
});

export async function attachOrderPhoto(orderId: string, input: z.input<typeof attachSchema>): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = attachSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid attachment." };
  const media = await db.mediaAsset.findUnique({ where: { id: parsed.data.mediaId }, select: { id: true } });
  if (!media) return { ok: false, error: "Upload not found." };
  await db.orderAttachment.create({ data: { orderId, ...parsed.data, uploadedBy: admin.email } });
  await db.orderEvent.create({ data: { orderId, kind: "note", note: `${parsed.data.kind.toUpperCase()} photo added${parsed.data.caption ? `: ${parsed.data.caption}` : ""}`, actorEmail: admin.email } });
  await audit(admin, "order.attach", "Order", orderId, parsed.data);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true };
}

export async function removeOrderAttachment(attachmentId: string): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const att = await db.orderAttachment.findUnique({ where: { id: attachmentId } });
  if (!att) return { ok: false, error: "Not found." };
  await db.orderAttachment.delete({ where: { id: attachmentId } });
  await audit(admin, "order.detach", "Order", att.orderId, { attachmentId, kind: att.kind });
  revalidatePath(`/admin/orders/${att.orderId}`);
  return { ok: true };
}

export async function emailOrderCustomer(orderId: string, subject: string, body: string): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const s = subject.trim().slice(0, 200);
  const b = body.trim().slice(0, 10_000);
  if (!s || !b) return { ok: false, error: "Add a subject and a message." };
  const order = await db.order.findUnique({ where: { id: orderId }, select: { contactEmail: true, contactName: true, orderNumber: true } });
  if (!order) return { ok: false, error: "Order not found." };
  const r = await emailFromTeam({ to: order.contactEmail, name: order.contactName, subject: s, body: b, reference: order.orderNumber, sender: admin.name, orderId, link: `${siteUrl}/order/${order.orderNumber}?t=${orderToken(order.orderNumber)}` });
  await audit(admin, "order.email", "Order", orderId, { subject: s, status: r.status });
  revalidatePath(`/admin/orders/${orderId}`);
  if (r.status === "failed") return { ok: false, error: "The email provider rejected the message — it is logged as failed. Check the address and try again." };
  return { ok: true, message: r.status === "sent" ? "Email sent and saved to the timeline." : "Saved to the timeline. Sending starts once the company email domain is connected." };
}
