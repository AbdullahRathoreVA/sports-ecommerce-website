import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";

/**
 * Client portal authentication — completely separate from the admin:
 * its own cookie, its own JWT audience, its own table (Customer).
 *
 * Customers are keyed by email and already exist for anyone who sent a quote
 * or placed an order. Creating a portal account sets a password on that row,
 * but nothing created BEFORE the email is proven (quotes, orders) is shown
 * until `emailVerifiedAt` is set — by a 6-digit emailed code, or by the team
 * in the admin. That stops anyone claiming someone else's email to read
 * their orders.
 */

export const CUSTOMER_COOKIE = "al_client";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, like most B2B portals
const AUDIENCE = "alrobel-client";
export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
const CODE_TTL_MINUTES = 15;
const CODE_MAX_ATTEMPTS = 5;

type Claims = { sub: string; tv: number };

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET is missing or shorter than 32 characters.");
  return new TextEncoder().encode(value);
}

async function sign(claims: Claims) {
  return new SignJWT({ tv: claims.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .setSubject(claims.sub)
    .setAudience(AUDIENCE)
    .sign(secret());
}

export async function startCustomerSession(customer: { id: string; tokenVersion: number }) {
  const token = await sign({ sub: customer.id, tv: customer.tokenVersion });
  const store = await cookies();
  store.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax so links from our own emails (verify, order updates) arrive signed in.
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endCustomerSession() {
  const store = await cookies();
  store.delete(CUSTOMER_COOKIE);
}

export type CurrentCustomer = {
  id: string;
  email: string;
  name: string;
  company: string | null;
  phone: string | null;
  country: string | null;
  verified: boolean;
  portalSince: Date | null;
};

/** The signed-in customer, re-checked against the database (revocation via tokenVersion). */
export async function getCurrentCustomer(): Promise<CurrentCustomer | null> {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  let claims: Claims;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], audience: AUDIENCE });
    claims = { sub: String(payload.sub), tv: Number(payload.tv) };
  } catch {
    return null;
  }
  const c = await db.customer.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, company: true, phone: true, country: true, emailVerifiedAt: true, portalSince: true, tokenVersion: true, passwordHash: true },
  });
  if (!c || !c.passwordHash || c.tokenVersion !== claims.tv) return null;
  return { id: c.id, email: c.email, name: c.name, company: c.company, phone: c.phone, country: c.country, verified: Boolean(c.emailVerifiedAt), portalSince: c.portalSince };
}

export async function requireCustomerPage(next = "/account"): Promise<CurrentCustomer> {
  const c = await getCurrentCustomer();
  if (!c) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return c;
}

/** Only ever an internal path — never an open redirect. */
export function safeNext(value: unknown, fallback = "/account") {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= hashPassword(crypto.randomUUID()));

export type CustomerLogin = { ok: true; customer: { id: string; tokenVersion: number } } | { ok: false; reason: "invalid" | "locked"; minutes?: number };

/** Same response and timing for unknown email, no portal account and wrong password. */
export async function attemptCustomerLogin(emailRaw: string, password: string): Promise<CustomerLogin> {
  const email = emailRaw.trim().toLowerCase();
  const c = await db.customer.findUnique({ where: { email }, select: { id: true, passwordHash: true, failedLogins: true, lockedUntil: true, tokenVersion: true } });
  if (!c?.passwordHash) {
    await verifyPassword(password, await dummyHash());
    return { ok: false, reason: "invalid" };
  }
  if (c.lockedUntil && c.lockedUntil > new Date()) {
    return { ok: false, reason: "locked", minutes: Math.ceil((c.lockedUntil.getTime() - Date.now()) / 60_000) };
  }
  if (!(await verifyPassword(password, c.passwordHash))) {
    const failed = c.failedLogins + 1;
    const lock = failed >= MAX_FAILED;
    await db.customer.update({
      where: { id: c.id },
      data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : c.lockedUntil },
    });
    return lock ? { ok: false, reason: "locked", minutes: LOCK_MINUTES } : { ok: false, reason: "invalid" };
  }
  await db.customer.update({ where: { id: c.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  return { ok: true, customer: { id: c.id, tokenVersion: c.tokenVersion } };
}

// ---- One-time codes -------------------------------------------------------

function codeHash(customerId: string, purpose: string, code: string) {
  const key = process.env.AUTH_SECRET ?? "dev-secret-not-for-production";
  return createHmac("sha256", key).update(`${customerId}:${purpose}:${code}`).digest("hex");
}

/** Creates a fresh code (invalidating older ones for the same purpose) and returns it for emailing. */
export async function issueCode(customerId: string, purpose: "verify" | "reset") {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.$transaction([
    db.customerCode.updateMany({ where: { customerId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    db.customerCode.create({
      data: { customerId, purpose, codeHash: codeHash(customerId, purpose, code), expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000) },
    }),
  ]);
  return code;
}

/** Checks a code; each wrong guess counts, and five wrong guesses burn it. */
export async function consumeCode(customerId: string, purpose: "verify" | "reset", code: string): Promise<boolean> {
  const row = await db.customerCode.findFirst({
    where: { customerId, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= CODE_MAX_ATTEMPTS) return false;
  const expected = Buffer.from(row.codeHash);
  const given = Buffer.from(codeHash(customerId, purpose, code.trim()));
  const ok = expected.length === given.length && timingSafeEqual(expected, given);
  await db.customerCode.update({ where: { id: row.id }, data: ok ? { usedAt: new Date() } : { attempts: { increment: 1 } } });
  return ok;
}

export { hashPassword };
