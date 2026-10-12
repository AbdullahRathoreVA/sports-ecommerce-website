import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { createLead } from "@/lib/leads";
import { db } from "@/lib/db";
import { newLeadNumber } from "@/lib/refs";
import { notifyTeam } from "@/lib/notify";
import { recordServerEvent } from "@/lib/analytics/server";
import { hit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  /** An email address or a WhatsApp / phone number — whichever the visitor prefers. */
  contact: z.string().trim().min(5, "Add your email or WhatsApp number").max(120),
  productSlug: z.string().trim().max(80).optional(),
  productName: z.string().trim().max(120).optional(),
  quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
  sessionId: z.string().max(64).optional(),
  website: z.string().max(200).optional(), // honeypot
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+\d][\d\s().-]{6,}$/;

/** "Send me prices" offer: the lightest way for an interested visitor to become a lead. */
export async function POST(request: Request) {
  const limit = hit(`offer:${clientIp(request.headers)}`, 4, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests — please try again in a few minutes." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true });
  const contact = d.contact.trim();
  const isEmail = EMAIL.test(contact);
  if (!isEmail && !PHONE.test(contact)) return NextResponse.json({ error: "Enter a valid email or WhatsApp number (with country code)." }, { status: 400 });

  try {
    if (isEmail) {
      const lead = await createLead({
        source: "PRICE_OFFER",
        name: d.name,
        email: contact.toLowerCase(),
        preferredChannel: "email",
        productSlug: d.productSlug,
        productName: d.productName,
        quantity: d.quantity,
        message: "Asked for prices from the website offer.",
        sessionId: d.sessionId,
      } as Parameters<typeof createLead>[0]);
      return NextResponse.json({ ok: true, leadNumber: lead.leadNumber });
    }
    // WhatsApp / phone only: no customer record (those are keyed by email) — the lead holds the number.
    const product = d.productSlug ? await db.product.findUnique({ where: { slug: d.productSlug }, select: { id: true, name: true, category: { select: { slug: true } } } }) : null;
    const session = d.sessionId ? await db.session.findUnique({ where: { id: d.sessionId }, select: { country: true, city: true } }) : null;
    const lead = await db.lead.create({
      data: {
        leadNumber: newLeadNumber(),
        source: "PRICE_OFFER",
        name: d.name,
        phone: contact,
        country: session?.country ?? null,
        city: session?.city ?? null,
        preferredChannel: "whatsapp",
        productId: product?.id ?? null,
        productName: product?.name ?? d.productName ?? null,
        category: product?.category.slug ?? null,
        quantity: d.quantity ?? null,
        message: "Asked for prices from the website offer — reply on WhatsApp.",
        sessionId: d.sessionId ?? null,
      },
      select: { id: true, leadNumber: true },
    });
    revalidateTag("admin", { expire: 0 });
    await recordServerEvent(d.sessionId, "quote_submit", { path: "/price-offer", productId: product?.id, label: lead.leadNumber, value: d.quantity });
    void notifyTeam(`New price request ${lead.leadNumber} — ${d.name}`, [`WhatsApp / phone: ${contact}`, product ? `Product: ${product.name}` : d.productName ? `Product: ${d.productName}` : "", d.quantity ? `Quantity: ${d.quantity}` : ""].filter(Boolean).join("\n"), { leadId: lead.id });
    return NextResponse.json({ ok: true, leadNumber: lead.leadNumber });
  } catch (error) {
    console.error("[price-offer] failed", error);
    return NextResponse.json({ error: "We couldn't save that just now — please try again." }, { status: 500 });
  }
}
