import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashInviteToken, looksLikeToken } from "@/lib/reviews/invite";
import { isSameOrigin } from "@/lib/admin/guard";

/** "Don't ask me for reviews again" from an invitation link. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { invite?: unknown } | null;
  if (!looksLikeToken(body?.invite)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  const inv = await db.reviewInvite.findUnique({ where: { tokenHash: hashInviteToken(body.invite) }, select: { id: true, customerId: true, email: true } });
  if (!inv) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  await db.reviewInvite.update({ where: { id: inv.id }, data: { optedOutAt: new Date() } });
  await db.customer.updateMany({ where: { OR: [{ id: inv.customerId ?? "-" }, { email: inv.email }] }, data: { reviewOptOut: true } });
  return NextResponse.json({ ok: true });
}
