"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, hashPassword, requireAdmin } from "@/lib/auth";

export type UserResult = { ok: true; message?: string; password?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageUsers");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

/** 16 characters from an unambiguous alphabet (~94 bits). Shown once, never stored in plain text. */
function tempPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const ROLES = ["OWNER", "ADMIN", "SALES", "EDITOR"] as const;

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  role: z.enum(ROLES),
});

export async function createUser(input: z.input<typeof createSchema>): Promise<UserResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Only an owner can manage users." };
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  if (await db.adminUser.findUnique({ where: { email: parsed.data.email }, select: { id: true } })) return { ok: false, error: "That email already has an account." };
  const password = tempPassword();
  const user = await db.adminUser.create({ data: { ...parsed.data, passwordHash: await hashPassword(password) } });
  await audit(admin, "user.create", "AdminUser", user.id, { email: user.email, role: user.role });
  revalidatePath("/admin/users");
  return { ok: true, message: `Account created for ${user.email}.`, password };
}

/** Never leave the system without an active owner. */
async function wouldOrphanOwners(userId: string, next: { role?: string; active?: boolean }) {
  const user = await db.adminUser.findUnique({ where: { id: userId }, select: { role: true, active: true } });
  if (!user || user.role !== "OWNER" || !user.active) return false;
  const losingOwner = (next.role && next.role !== "OWNER") || next.active === false;
  if (!losingOwner) return false;
  return (await db.adminUser.count({ where: { role: "OWNER", active: true } })) <= 1;
}

export async function updateUser(userId: string, input: { role?: (typeof ROLES)[number]; active?: boolean }): Promise<UserResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Only an owner can manage users." };
  const role = input.role && ROLES.includes(input.role) ? input.role : undefined;
  const active = typeof input.active === "boolean" ? input.active : undefined;
  if (await wouldOrphanOwners(userId, { role, active })) return { ok: false, error: "There must always be at least one active owner." };
  const before = await db.adminUser.findUnique({ where: { id: userId }, select: { role: true, active: true } });
  if (!before) return { ok: false, error: "User not found." };
  await db.adminUser.update({
    where: { id: userId },
    // Role or access changes end the user's current sessions immediately.
    data: { ...(role ? { role } : {}), ...(active !== undefined ? { active } : {}), tokenVersion: { increment: 1 } },
  });
  await audit(admin, active === false ? "user.deactivate" : active === true ? "user.activate" : "user.role", "AdminUser", userId, { from: before, to: { role: role ?? before.role, active: active ?? before.active } });
  revalidatePath("/admin/users");
  return { ok: true, message: "Updated. Their open sessions were signed out." };
}

export async function resetPassword(userId: string): Promise<UserResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Only an owner can manage users." };
  const password = tempPassword();
  const user = await db.adminUser.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null },
    select: { email: true },
  });
  await audit(admin, "user.password_reset", "AdminUser", userId);
  revalidatePath("/admin/users");
  return { ok: true, message: `New password for ${user.email}. Their open sessions were signed out.`, password };
}

export async function signOutEverywhere(userId: string): Promise<UserResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Only an owner can manage users." };
  await db.adminUser.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  await audit(admin, "user.revoke_sessions", "AdminUser", userId);
  revalidatePath("/admin/users");
  return { ok: true, message: "All sessions for this user were signed out." };
}

const pwSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Mix letters and numbers");

/** Any signed-in admin can change their own password (needs the current one). */
export async function changeOwnPassword(current: string, next: string): Promise<UserResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { ok: false, error: "Sign in again." };
  }
  const parsed = pwSchema.safeParse(next);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Choose a stronger password" };
  const { verifyPassword } = await import("@/lib/auth");
  const user = await db.adminUser.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) return { ok: false, error: "Current password is wrong." };
  await db.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(parsed.data), tokenVersion: { increment: 1 } } });
  await audit(admin, "user.password_change", "AdminUser", admin.id);
  return { ok: true, message: "Password changed. Please sign in again." };
}
