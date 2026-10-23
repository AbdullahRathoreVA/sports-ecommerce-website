"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/catalog";
import { sendMail } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/config/site";
import { INVITE_DAYS, newInviteToken } from "@/lib/reviews/invite";
import { fillTemplate, REVIEW_TEMPLATES } from "@/lib/reviews/templates";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageContent");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const reviewSchema = z
  .object({
    author: z.string().trim().min(2, "Add the reviewer's name").max(80),
    role: opt(80),
    company: opt(100),
    country: opt(60),
    email: opt(120),
    productLine: opt(80),
    title: opt(100),
    rating: z.number().int().min(1).max(5).nullable(),
    quote: z.string().trim().min(10, "The review is too short").max(1200),
    photo: z.string().trim().max(300).optional().transform((v) => (v ? v : null)).refine((v) => !v || /^\/(uploads|media)\//.test(v), "Upload the photo here"),
    response: opt(1200),
    modNote: opt(1200),
    featured: z.boolean(),
    published: z.boolean(),
    confirmGenuine: z.boolean(),
  })
  .refine((r) => !r.published || r.confirmGenuine, { message: "Confirm this is a genuine review you have permission to publish", path: ["confirmGenuine"] });

const done = () => {
  updateTag(CONTENT_TAG);
  revalidateTag("admin", { expire: 0 });
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
};

/**
 * Add (e.g. a review a real customer sent on WhatsApp — their own words, with
 * permission) or edit a review. "Verified buyer" is NOT set here: it needs a
 * recorded reason via verifyReview().
 */
export async function saveReview(id: string | null, input: z.input<typeof reviewSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to manage reviews." };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review." };
  const { confirmGenuine, ...data } = parsed.data;
  const before = id ? await db.testimonial.findUnique({ where: { id }, select: { isDemo: true, approvedAt: true, response: true, spam: true } }) : null;
  if (before?.isDemo) return { ok: false, error: "Demo fixtures can't be saved or published." };
  if (before?.spam && data.published) return { ok: false, error: "This review is marked as spam — un-mark it first." };
  const now = new Date();
  const stamps = {
    approvedAt: data.published ? (before?.approvedAt ?? now) : (before?.approvedAt ?? null),
    respondedAt: data.response && data.response !== before?.response ? now : undefined,
  };
  const row = id
    ? await db.testimonial.update({ where: { id }, data: { ...data, ...stamps, pending: false, ...(data.published ? { rejected: false } : {}) } })
    : await db.testimonial.create({ data: { ...data, ...stamps, source: "admin", pending: false, consentAt: confirmGenuine ? now : null, consentVersion: confirmGenuine ? "admin-confirmed" : null } });
  await audit(admin, id ? "review.update" : "review.create", "Testimonial", row.id, { author: data.author, published: data.published, confirmGenuine });
  done();
  return { ok: true, message: data.published ? "Saved and live on the website." : "Saved (not shown on the website)." };
}

/** One-tap moderation: publish / hide / feature. */
export async function setReview(id: string, patch: { published?: boolean; featured?: boolean }): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const r = await db.testimonial.findUnique({ where: { id }, select: { isDemo: true, spam: true, consentAt: true, source: true, approvedAt: true } });
  if (!r) return { ok: false, error: "Review not found." };
  if (patch.published) {
    if (r.isDemo) return { ok: false, error: "Demo fixtures can never be published." };
    if (r.spam) return { ok: false, error: "This review is marked as spam." };
    if (!r.consentAt) return { ok: false, error: "No publication consent is recorded — use Edit and confirm the customer agreed." };
  }
  await db.testimonial.update({
    where: { id },
    data: { ...patch, pending: false, ...(patch.published ? { rejected: false, rejectReason: null, approvedAt: r.approvedAt ?? new Date() } : {}) },
  });
  await audit(admin, "review.moderate", "Testimonial", id, patch);
  done();
  return { ok: true, message: patch.published === true ? "Published — it's on the website now." : patch.published === false ? "Hidden from the website." : "Saved." };
}

/** Turn a review down (kept for the record, never shown). Spam = bots/abuse. */
export async function rejectReview(id: string, reason: string, spam: boolean): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  await db.testimonial.update({ where: { id }, data: { rejected: true, spam, rejectReason: reason.trim().slice(0, 300) || null, published: false, featured: false, pending: false } });
  await audit(admin, spam ? "review.spam" : "review.reject", "Testimonial", id, { reason: reason.slice(0, 300) });
  done();
  return { ok: true, message: spam ? "Marked as spam." : "Rejected — it won't appear on the website." };
}

/** Mark a review as a verified buyer, recording what was checked (order no., invoice …). */
export async function verifyReview(id: string, note: string | null): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const r = await db.testimonial.findUnique({ where: { id }, select: { isDemo: true } });
  if (!r || r.isDemo) return { ok: false, error: "This review can't be verified." };
  if (note === null) {
    await db.testimonial.update({ where: { id }, data: { verified: false, verifiedVia: null, verifiedNote: null, verifiedBy: null, verifiedAt: null } });
    await audit(admin, "review.unverify", "Testimonial", id);
    done();
    return { ok: true, message: "Verification removed." };
  }
  const clean = note.trim();
  if (clean.length < 3) return { ok: false, error: "Write what you checked — e.g. the order or invoice number." };
  const order = await db.order.findFirst({ where: { OR: [{ orderNumber: clean.toUpperCase() }, { invoices: { some: { invoiceNumber: clean.toUpperCase() } } }] }, select: { id: true } });
  await db.testimonial.update({ where: { id }, data: { verified: true, verifiedVia: "admin", verifiedNote: clean.slice(0, 300), verifiedBy: admin.email, verifiedAt: new Date(), ...(order ? { orderId: order.id } : {}) } });
  await audit(admin, "review.verify", "Testimonial", id, { note: clean.slice(0, 300), linkedOrder: Boolean(order) });
  done();
  return { ok: true, message: order ? "Verified and linked to the order." : "Verified (reason recorded)." };
}

/** Ask the reviewer a question by email (e.g. which order, or permission to show a photo). */
export async function askReviewer(id: string, message: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const r = await db.testimonial.findUnique({ where: { id }, select: { email: true, author: true } });
  if (!r?.email) return { ok: false, error: "This review has no email address." };
  const s = await getSettings();
  const res = await sendMail({ to: r.email, kind: "review_question", replyTo: s.contact.email || null, subject: `About your review of ${s.brand.name}`, text: `Hi ${r.author},\n\n${message.trim().slice(0, 2000)}\n\nThank you,\n${s.brand.name}` });
  await audit(admin, "review.ask", "Testimonial", id, { status: res.status });
  return res.status === "sent" ? { ok: true, message: "Email sent." } : { ok: false, error: "Email sending isn't switched on yet — reply from info@ in Zoho instead." };
}

export async function deleteReview(id: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  await db.testimonial.delete({ where: { id } }).catch(() => null);
  await audit(admin, "review.delete", "Testimonial", id);
  done();
  return { ok: true, message: "Review deleted." };
}

const inviteSchema = z.object({
  orderId: z.string().max(40).optional(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  productLine: z.string().trim().max(80).optional(),
  send: z.boolean(),
});

/**
 * One-time review link for a real order (reviews through it are verified),
 * or a plain personal link when there's no order on the website. The link is
 * returned once — only its hash is stored.
 */
export async function createInvite(input: z.input<typeof inviteSchema>): Promise<{ ok: true; link: string; sent: boolean; message: string } | { ok: false; error: string }> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add the customer's name and a valid email." };
  const d = parsed.data;
  const order = d.orderId ? await db.order.findUnique({ where: { id: d.orderId }, select: { id: true, isDemo: true, customerId: true, orderNumber: true, customer: { select: { reviewOptOut: true } } } }) : null;
  if (d.orderId && (!order || order.isDemo)) return { ok: false, error: "That order can't be used for a review invitation." };
  if (order?.customer.reviewOptOut) return { ok: false, error: "This customer asked not to receive review requests." };
  const optedOut = await db.customer.findFirst({ where: { email: d.email, reviewOptOut: true }, select: { id: true } });
  if (optedOut) return { ok: false, error: "This customer asked not to receive review requests." };
  if (order) {
    const open = await db.reviewInvite.findFirst({ where: { orderId: order.id, usedAt: null, optedOutAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (open) return { ok: false, error: "This order already has an open review link — avoid sending repeated requests." };
  }
  const { token, hash } = newInviteToken();
  const link = `${siteUrl}/reviews/new?invite=${token}`;
  const invite = await db.reviewInvite.create({
    data: { tokenHash: hash, orderId: order?.id ?? null, customerId: order?.customerId ?? null, email: d.email, name: d.name, productLine: d.productLine || null, channel: d.send ? "email" : "link", createdBy: admin.email, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) },
  });
  let sent = false;
  if (d.send) {
    const s = await getSettings();
    const t = REVIEW_TEMPLATES.find((x) => x.id === "post-delivery")!;
    const vars = { name: d.name, order: order?.orderNumber ?? "your order", link, product: d.productLine || "your order", company: s.brand.name };
    const r = await sendMail({ to: d.email, kind: "review_invite", orderId: order?.id ?? null, replyTo: s.contact.email || null, subject: fillTemplate(t.subject!, vars), text: fillTemplate(t.email, vars) });
    sent = r.status === "sent";
    await db.reviewInvite.update({ where: { id: invite.id }, data: { sentAt: sent ? new Date() : null, sendStatus: r.status } });
  }
  await audit(admin, "review.invite", "ReviewInvite", invite.id, { orderId: order?.id ?? null, channel: d.send ? "email" : "link", sent });
  revalidatePath("/admin/reviews");
  return { ok: true, link, sent, message: d.send ? (sent ? "Review request emailed. You can also copy the link below." : "Email sending isn't on yet — copy the link or WhatsApp message below.") : "Link created — copy it below. It works once and expires in 60 days." };
}
