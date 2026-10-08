"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, hit } from "@/lib/rate-limit";
import { emailSchema, phoneSchema } from "@/lib/validation";
import { emailPortalCode } from "@/lib/emails";
import {
  attemptCustomerLogin,
  consumeCode,
  endCustomerSession,
  getCurrentCustomer,
  hashPassword,
  issueCode,
  safeNext,
  startCustomerSession,
} from "@/lib/customer-auth";
import { verifyPassword } from "@/lib/auth";

/** `values` echoes what was typed: React resets a form after its action runs, so inputs re-read them as defaults. */
export type FormState = { error?: string; ok?: string; step?: "code"; email?: string; values?: Record<string, string> } | undefined;

const keep = (fd: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(fd.get(k) ?? "")]));
const SIGNUP_KEYS = ["name", "email", "company", "phone", "country"];
const PROFILE_KEYS = ["name", "company", "phone", "country"];

const passwordSchema = z.string().min(8, "Use at least 8 characters.").max(200);
const nameSchema = z.string().trim().min(2, "Enter your name.").max(80);
const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

async function limited(key: string, limit: number, minutes: number) {
  const ip = clientIp(await headers());
  return !hit(`${key}:${ip}`, limit, minutes * 60_000).ok;
}

/** Sends a code; reports honestly when email delivery isn't switched on yet. */
async function sendCode(c: { id: string; email: string; name: string }, purpose: "verify" | "reset") {
  const code = await issueCode(c.id, purpose);
  const result = await emailPortalCode(c, code, purpose).catch(() => ({ status: "failed" as const }));
  return result.status;
}

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  if (fd.get("website")) return { error: "Something went wrong." }; // honeypot
  if (await limited("portal-signup", 5, 60)) return { error: "Too many attempts — please try again later." };
  const parsed = z
    .object({ name: nameSchema, email: emailSchema, password: passwordSchema, company: optional(120), phone: phoneSchema, country: optional(80) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", values: keep(fd, SIGNUP_KEYS) };
  const d = parsed.data;

  const existing = await db.customer.findUnique({ where: { email: d.email }, select: { id: true, passwordHash: true, name: true, company: true, phone: true, country: true } });
  if (existing?.passwordHash) return { error: "An account with this email already exists. Log in, or reset your password.", values: keep(fd, SIGNUP_KEYS) };

  const passwordHash = await hashPassword(d.password);
  const customer = existing
    ? // Earlier quotes/orders created this row: claim it, but never overwrite details the team may have corrected.
      await db.customer.update({
        where: { id: existing.id },
        data: { passwordHash, portalSince: new Date(), company: existing.company ?? d.company, phone: existing.phone ?? d.phone, country: existing.country ?? d.country },
        select: { id: true, email: true, name: true, tokenVersion: true },
      })
    : await db.customer.create({
        data: { email: d.email, name: d.name, company: d.company, phone: d.phone, country: d.country, source: "PORTAL", passwordHash, portalSince: new Date() },
        select: { id: true, email: true, name: true, tokenVersion: true },
      });

  await sendCode({ ...customer, name: d.name }, "verify");
  await startCustomerSession(customer);
  redirect("/account/verify");
}

export async function logIn(_prev: FormState, fd: FormData): Promise<FormState> {
  if (await limited("portal-login", 20, 15)) return { error: "Too many attempts — please wait a few minutes." };
  const email = String(fd.get("email") ?? "");
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };
  const result = await attemptCustomerLogin(email, password);
  if (!result.ok) {
    return { error: result.reason === "locked" ? `Too many failed attempts. Try again in ${result.minutes} minutes, or reset your password.` : "That email and password don't match.", values: { email } };
  }
  await startCustomerSession(result.customer);
  redirect(safeNext(fd.get("next")));
}

export async function logOut() {
  await endCustomerSession();
  redirect("/account/login");
}

export async function verifyEmail(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await getCurrentCustomer();
  if (!c) redirect("/account/login");
  if (c.verified) redirect("/account");
  if (await limited(`portal-verify:${c.id}`, 10, 15)) return { error: "Too many attempts — please wait a few minutes." };
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6-digit code from the email." };
  if (!(await consumeCode(c.id, "verify", code))) return { error: "That code is wrong or has expired. Request a new one." };
  await db.customer.update({ where: { id: c.id }, data: { emailVerifiedAt: new Date() } });
  redirect("/account?welcome=1");
}

export async function resendCode(): Promise<FormState> {
  const c = await getCurrentCustomer();
  if (!c) redirect("/account/login");
  if (c.verified) redirect("/account");
  if (await limited(`portal-resend:${c.id}`, 3, 15)) return { error: "Please wait a few minutes before asking for another code." };
  const status = await sendCode(c, "verify");
  if (status === "sent") return { ok: `New code sent to ${c.email}.` };
  return { error: "We couldn't send the email right now. Message our team and we'll verify your account for you." };
}

export async function forgotPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const step = fd.get("step");
  const parsedEmail = emailSchema.safeParse(fd.get("email"));
  if (!parsedEmail.success) return { error: "Enter a valid email address." };
  const email = parsedEmail.data;

  if (step !== "code") {
    if (await limited("portal-forgot", 5, 30)) return { error: "Too many requests — please try again later." };
    const c = await db.customer.findUnique({ where: { email }, select: { id: true, email: true, name: true, passwordHash: true } });
    // Same answer whether or not the account exists.
    if (c?.passwordHash) await sendCode(c, "reset");
    return { step: "code", email, ok: "If that email has an account, we've sent a 6-digit code to it." };
  }

  if (await limited("portal-reset", 10, 15)) return { step: "code", email, error: "Too many attempts — please wait a few minutes." };
  const code = String(fd.get("code") ?? "").replace(/\D/g, "");
  const password = passwordSchema.safeParse(fd.get("password"));
  if (!password.success) return { step: "code", email, error: password.error.issues[0]?.message };
  const c = await db.customer.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!c?.passwordHash || code.length !== 6 || !(await consumeCode(c.id, "reset", code))) {
    return { step: "code", email, error: "That code is wrong or has expired." };
  }
  const updated = await db.customer.update({
    where: { id: c.id },
    // The code proves they own the inbox, so this also verifies the email. New version = every old session ends.
    data: { passwordHash: await hashPassword(password.data), tokenVersion: { increment: 1 }, failedLogins: 0, lockedUntil: null, emailVerifiedAt: new Date() },
    select: { id: true, tokenVersion: true },
  });
  await startCustomerSession(updated);
  redirect("/account");
}

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await getCurrentCustomer();
  if (!c) redirect("/account/login");
  const parsed = z
    .object({ name: nameSchema, company: optional(120), phone: phoneSchema, country: optional(80) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", values: keep(fd, PROFILE_KEYS) };
  await db.customer.update({ where: { id: c.id }, data: { name: parsed.data.name, company: parsed.data.company ?? null, phone: parsed.data.phone ?? null, country: parsed.data.country ?? null } });
  return { ok: "Saved.", values: keep(fd, PROFILE_KEYS) };
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const c = await getCurrentCustomer();
  if (!c) redirect("/account/login");
  if (await limited(`portal-pw:${c.id}`, 5, 15)) return { error: "Too many attempts — please wait a few minutes." };
  const next = passwordSchema.safeParse(fd.get("password"));
  if (!next.success) return { error: next.error.issues[0]?.message };
  const row = await db.customer.findUnique({ where: { id: c.id }, select: { passwordHash: true } });
  if (!row?.passwordHash || !(await verifyPassword(String(fd.get("current") ?? ""), row.passwordHash))) return { error: "Your current password is wrong." };
  const updated = await db.customer.update({ where: { id: c.id }, data: { passwordHash: await hashPassword(next.data), tokenVersion: { increment: 1 } }, select: { id: true, tokenVersion: true } });
  // Other devices are signed out; this one gets a fresh session.
  await startCustomerSession(updated);
  return { ok: "Password changed. Other devices have been signed out." };
}
