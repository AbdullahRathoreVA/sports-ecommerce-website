"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";

/**
 * Client portal controls. Verifying here is for customers the team already
 * knows (e.g. confirmed by phone or WhatsApp) — it unlocks their past quotes
 * and orders in the portal, so only staff who manage customers may do it.
 */

async function guard() {
  try {
    return await requireAdmin("manageLeads");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

export async function verifyPortalEmail(customerId: string) {
  const admin = await guard();
  if (!admin) return;
  const c = await db.customer.findUnique({ where: { id: customerId }, select: { passwordHash: true, emailVerifiedAt: true } });
  if (!c?.passwordHash || c.emailVerifiedAt) return;
  await db.customer.update({ where: { id: customerId }, data: { emailVerifiedAt: new Date() } });
  await audit({ actorId: admin.id, actorEmail: admin.email }, "customer.portal_verified", "Customer", customerId);
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function revokePortalSessions(customerId: string) {
  const admin = await guard();
  if (!admin) return;
  await db.customer.update({ where: { id: customerId }, data: { tokenVersion: { increment: 1 } } });
  await audit({ actorId: admin.id, actorEmail: admin.email }, "customer.portal_sessions_revoked", "Customer", customerId);
  revalidatePath(`/admin/customers/${customerId}`);
}
