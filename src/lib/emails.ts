import "server-only";
import { sendMail } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { orderToken } from "@/lib/refs";
import { formatMoney } from "@/lib/utils";
import { siteUrl } from "@/config/site";

/**
 * Customer-facing email templates. Plain, specific, and written to be
 * evidence: every message names the order, the items, the amounts and the
 * terms, and invites the customer to reply by email (not chat) with any issue.
 */

type OrderForEmail = {
  id: string;
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  currency: string;
  totalCents: number;
  paymentMethod: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  items: { nameSnapshot: string; quantity: number; size: string | null; isSample: boolean; totalCents: number }[];
};

function lines(o: OrderForEmail) {
  return o.items.map((i) => `- ${i.quantity} × ${i.nameSnapshot}${i.size ? ` (${i.size})` : ""}${i.isSample ? " [sample]" : ""} — ${formatMoney(i.totalCents, o.currency)}`);
}

export async function emailOrderReceived(o: OrderForEmail) {
  const s = await getSettings();
  const method = s.commerce.paymentMethods.find((m) => m.id === o.paymentMethod);
  return sendMail({
    to: o.contactEmail,
    kind: "order_received",
    orderId: o.id,
    replyTo: s.contact.email || null,
    subject: `Order ${o.orderNumber} received — ${s.brand.name}`,
    text: [
      `Hi ${o.contactName},`,
      "",
      `Thank you — we've received your order ${o.orderNumber}. We'll confirm it in writing before any payment is due.`,
      "",
      ...lines(o),
      "",
      `Subtotal: ${formatMoney(o.totalCents, o.currency)} (freight quoted separately)`,
      `Payment: ${method?.label ?? o.paymentMethod} — ${method?.detail ?? ""}`,
      "",
      `Track your order: ${siteUrl}/order/${o.orderNumber}?t=${orderToken(o.orderNumber)}`,
      "",
      "If anything is wrong, please reply to this email so we have a written record.",
      "",
      s.brand.name,
    ].join("\n"),
  });
}

const STATUS_COPY: Record<string, string> = {
  CONFIRMED: "Your order is confirmed. Our proforma invoice and payment details follow — production is scheduled once payment terms are met.",
  PROCESSING: "Your order is being prepared for production: materials and artwork are being finalised.",
  MANUFACTURING: "Your order is now in production in our factory.",
  SHIPPED: "Your order has been packed and dispatched.",
  DELIVERED: "Your order has been marked as delivered. If anything isn't right, reply to this email within 14 days with photos.",
  CANCELLED: "Your order has been cancelled. If you didn't expect this, please reply to this email.",
  REFUNDED: "A refund has been issued for your order.",
};

export async function emailOrderStatus(o: OrderForEmail, status: string) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  const s = await getSettings();
  return sendMail({
    to: o.contactEmail,
    kind: `order_${status.toLowerCase()}`,
    orderId: o.id,
    replyTo: s.contact.email || null,
    subject: `Order ${o.orderNumber}: ${status.charAt(0) + status.slice(1).toLowerCase()} — ${s.brand.name}`,
    text: [
      `Hi ${o.contactName},`,
      "",
      copy,
      ...(status === "SHIPPED" && o.trackingNumber ? ["", `Carrier: ${o.carrier ?? "—"}`, `Tracking number: ${o.trackingNumber}`] : []),
      "",
      ...lines(o),
      `Total: ${formatMoney(o.totalCents, o.currency)}`,
      "",
      `Order page: ${siteUrl}/order/${o.orderNumber}?t=${orderToken(o.orderNumber)}`,
      "",
      s.brand.name,
    ].join("\n"),
  });
}

export async function emailLeadReceived(lead: { id: string; leadNumber: string; name: string; email: string; productName?: string | null; quantity?: number | null }) {
  const s = await getSettings();
  return sendMail({
    to: lead.email,
    kind: "lead_received",
    leadId: lead.id,
    replyTo: s.contact.email || null,
    subject: `We've received your request ${lead.leadNumber} — ${s.brand.name}`,
    text: [
      `Hi ${lead.name},`,
      "",
      `Thanks for your enquiry${lead.productName ? ` about ${lead.productName}` : ""}${lead.quantity ? ` (${lead.quantity} units)` : ""}. Your reference is ${lead.leadNumber}.`,
      s.contact.responseTime || "We'll be in touch shortly.",
      "",
      "Every quote we send is in writing by email — please keep this thread for your records and reply here with artwork, size lists or questions.",
      "",
      s.brand.name,
    ].join("\n"),
  });
}

/**
 * A free-form message written by the team in the admin (quote, revision,
 * shipping update). Sent from the company address and kept in EmailLog
 * against the order or lead, so the written record lives in one place.
 */
export async function emailFromTeam(m: { to: string; name: string; subject: string; body: string; reference: string; sender: string; orderId?: string; leadId?: string; link?: string }) {
  const s = await getSettings();
  return sendMail({
    to: m.to,
    kind: "team_message",
    orderId: m.orderId ?? null,
    leadId: m.leadId ?? null,
    replyTo: s.contact.email || null,
    subject: m.subject.includes(m.reference) ? m.subject : `${m.subject} [${m.reference}]`,
    text: [`Hi ${m.name},`, "", m.body.trim(), "", `${m.sender}`, s.brand.name, "", `Reference: ${m.reference} — please keep this reference in your reply.`].join("\n"),
  });
}

/** Client portal one-time code (email verification or password reset). */
export async function emailPortalCode(c: { email: string; name: string }, code: string, purpose: "verify" | "reset") {
  const s = await getSettings();
  const verify = purpose === "verify";
  return sendMail({
    to: c.email,
    kind: verify ? "portal_verify" : "portal_reset",
    replyTo: s.contact.email || null,
    subject: `${code} is your ${s.brand.name} ${verify ? "verification" : "password reset"} code`,
    text: [
      `Hi ${c.name},`,
      "",
      verify ? "Use this code to verify your email and see your quotes and orders in your client portal:" : "Use this code to reset your client portal password:",
      "",
      `    ${code}`,
      "",
      "It expires in 15 minutes. If you didn't ask for this, you can ignore this email.",
      "",
      `${siteUrl}/account`,
      "",
      s.brand.name,
    ].join("\n"),
  });
}
