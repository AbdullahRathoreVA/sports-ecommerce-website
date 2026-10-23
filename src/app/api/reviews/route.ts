import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { notifyTeam } from "@/lib/notify";
import { hit, clientIp } from "@/lib/rate-limit";
import { CONSENT_VERSION, reviewSubmissionSchema } from "@/lib/reviews/schema";
import { hashInviteToken, inviteState, looksLikeToken } from "@/lib/reviews/invite";

export const runtime = "nodejs";

/**
 * A client review from the website. Always saved as pending: it appears only
 * after the team publishes it. "Verified buyer" is set ONLY when the review
 * arrives through a valid one-time invitation created for a real order — an
 * email address alone proves nothing (anyone can type a customer's email),
 * so an email match is kept as a private hint for the team to check.
 */
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = hit(`review:${ip}`, 3, 30 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Thanks — you've already sent a review. Please try again later." }, { status: 429 });

  const parsed = reviewSubmissionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  // consent is a required literal true in the schema; it is stored as consentAt/consentVersion below.
  const { website, photo, invite: token, ...rest } = parsed.data;
  const { consent, ...d } = rest;
  void consent;
  if (website) return NextResponse.json({ ok: true }); // honeypot: pretend success to bots

  // Duplicate guard: one pending review per email per day.
  const recent = await db.testimonial.count({ where: { email: d.email, createdAt: { gt: new Date(Date.now() - 86_400_000) } } });
  if (recent >= 1) return NextResponse.json({ error: "We already have a review from this email today — our team will read it soon." }, { status: 429 });

  let invite: { id: string; orderId: string | null; customerId: string | null } | null = null;
  if (token) {
    if (!looksLikeToken(token)) return NextResponse.json({ error: "This review link isn't valid." }, { status: 400 });
    const row = await db.reviewInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
    const state = row ? inviteState(row) : "expired";
    if (!row || state !== "valid") {
      return NextResponse.json({ error: state === "used" ? "This review link has already been used — thank you!" : "This review link has expired. You can still leave a review without it." }, { status: 410 });
    }
    invite = { id: row.id, orderId: row.orderId, customerId: row.customerId };
  }

  // Private hint only (not verification): does this email belong to a customer?
  const customer = invite?.customerId ? { id: invite.customerId } : await db.customer.findUnique({ where: { email: d.email }, select: { id: true } }).catch(() => null);

  const row = await db.$transaction(async (tx) => {
    const created = await tx.testimonial.create({
      data: {
        author: d.author,
        role: d.role || null,
        company: d.company || null,
        country: d.country || null,
        email: d.email,
        productLine: d.productLine || null,
        title: d.title || null,
        rating: d.rating,
        quote: d.quote,
        photo: photo || null,
        source: invite ? "invite" : "website",
        pending: true,
        published: false,
        verified: Boolean(invite?.orderId),
        verifiedVia: invite?.orderId ? "invite" : null,
        verifiedAt: invite?.orderId ? new Date() : null,
        orderId: invite?.orderId ?? null,
        customerId: customer?.id ?? null,
        consentAt: new Date(),
        consentVersion: CONSENT_VERSION,
      },
      select: { id: true },
    });
    if (invite) {
      // Single use: the conditional update fails if a parallel request already used it.
      const used = await tx.reviewInvite.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: new Date(), testimonialId: created.id } });
      if (used.count !== 1) throw new Error("invite already used");
    }
    return created;
  }).catch(() => null);
  if (!row) return NextResponse.json({ error: "This review link has already been used — thank you!" }, { status: 410 });

  revalidateTag("admin", { expire: 0 });
  void notifyTeam(
    `New ${d.rating}★ review from ${d.author}${invite?.orderId ? " (verified order)" : ""}`,
    [`${d.author}${d.company ? `, ${d.company}` : ""}${d.country ? ` (${d.country})` : ""}`, `${d.rating} / 5 stars`, d.title ? `“${d.title}”` : "", "", d.quote, "", "Publish, reply or reject it in Admin → Reviews."].filter((l, i) => l || i > 2).join("\n"),
  );
  return NextResponse.json({ ok: true, id: row.id });
}
