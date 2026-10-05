import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/rate-limit";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  readToken,
  type AdminRole,
  type SessionClaims,
} from "@/lib/session";

/**
 * Node-runtime admin authentication. Never import from the proxy.
 *
 * Stateless JWT in an httpOnly cookie; `tokenVersion` is re-checked against
 * the database on every privileged request, so bumping it (password change,
 * revoke, deactivate) kills every outstanding session immediately.
 */

export { SESSION_COOKIE, createSession, readToken };
export type { AdminRole, SessionClaims };

export const MAX_FAILED_LOGINS = 5;
export const LOCKOUT_MINUTES = 15;

/** What each role may do. Checked server-side on every action. */
export const PERMISSIONS = {
  viewDashboard: ["OWNER", "ADMIN", "SALES", "EDITOR"],
  viewAnalytics: ["OWNER", "ADMIN", "SALES"],
  manageOrders: ["OWNER", "ADMIN", "SALES"],
  manageLeads: ["OWNER", "ADMIN", "SALES"],
  viewCustomers: ["OWNER", "ADMIN", "SALES"],
  manageProducts: ["OWNER", "ADMIN", "EDITOR"],
  manageContent: ["OWNER", "ADMIN", "EDITOR"],
  useAdminAi: ["OWNER", "ADMIN", "SALES"],
  viewAudit: ["OWNER", "ADMIN"],
  manageUsers: ["OWNER"],
  purgeDemoData: ["OWNER", "ADMIN"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: AdminRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role);
}

export async function hashPassword(plain: string): Promise<string> {
  // 12 rounds ≈ 250ms: expensive offline, still fine inside a serverless login.
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A real 12-round hash of random bytes, compared against for unknown emails so
 * the response takes as long as a genuine check. Built once per instance.
 */
let dummyHash: Promise<string> | null = null;
function getDummyHash() {
  dummyHash ??= bcrypt.hash(crypto.randomUUID(), 12);
  return dummyHash;
}

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; reason: "invalid" | "locked"; retryAfterMinutes?: number };

/**
 * Credential check with database-backed lockout.
 *
 * - Unknown email still pays the bcrypt cost, so timing does not reveal which
 *   addresses have accounts.
 * - Unknown email, wrong password and deactivated account return the same
 *   "invalid" result.
 * - Five failures lock the account for 15 minutes across every instance.
 */
export async function attemptLogin(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const user = await db.adminUser.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(password, await getDummyHash());
    return { ok: false, reason: "invalid" };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { ok: false, reason: "locked", retryAfterMinutes: minutes };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid || !user.active) {
    const failed = user.failedLogins + 1;
    const lock = failed >= MAX_FAILED_LOGINS;
    await db.adminUser.update({
      where: { id: user.id },
      data: {
        failedLogins: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : user.lockedUntil,
      },
    });
    await audit({ actorId: user.id, actorEmail: user.email }, "auth.login_failed", "AdminUser", user.id, {
      locked: lock,
    });
    return lock
      ? { ok: false, reason: "locked", retryAfterMinutes: LOCKOUT_MINUTES }
      : { ok: false, reason: "invalid" };
  }

  await db.adminUser.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await audit({ actorId: user.id, actorEmail: user.email }, "auth.login", "AdminUser", user.id);

  const token = await createSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    tv: user.tokenVersion,
  });
  return { ok: true, token };
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // unreadable from JS, so XSS cannot steal it
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", // admin never needs cross-site navigation with a session
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type CurrentAdmin = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

/**
 * Authoritative session check. Re-reads the user every request so a
 * deactivated account or bumped tokenVersion takes effect immediately.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await readToken(token);
  if (!claims) return null;

  const user = await db.adminUser.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, role: true, active: true, tokenVersion: true },
  });
  if (!user || !user.active || user.tokenVersion !== claims.tv) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** For pages: redirect to login when there is no valid session. */
export async function requireAdminPage(permission?: Permission): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !can(admin.role, permission)) redirect("/admin?denied=1");
  return admin;
}

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN");
  }
}

/** For server actions and API routes: throw rather than redirect. */
export async function requireAdmin(permission?: Permission): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AuthError(401);
  if (permission && !can(admin.role, permission)) throw new AuthError(403);
  return admin;
}

type Actor = { actorId?: string | null; actorEmail?: string | null };

/**
 * Append an audit record. Never throws — an audit failure must not block the
 * action it describes, but it is logged loudly.
 */
export async function audit(
  actor: Actor | CurrentAdmin,
  action: string,
  entity: string,
  entityId?: string | null,
  diff?: unknown,
) {
  try {
    const h = await headers().catch(() => null);
    const actorId = "actorId" in actor ? actor.actorId : (actor as CurrentAdmin).id;
    const actorEmail = "actorEmail" in actor ? actor.actorEmail : (actor as CurrentAdmin).email;
    await db.auditLog.create({
      data: {
        actorId: actorId ?? null,
        actorEmail: actorEmail ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        diff: diff === undefined ? undefined : (JSON.parse(JSON.stringify(diff)) as object),
        ip: h ? clientIp(h) : null,
        userAgent: h?.get("user-agent")?.slice(0, 200) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to record", action, error);
  }
}

/** Shallow diff of changed fields, for readable audit entries. */
export function changedFields<T extends Record<string, unknown>>(before: T, after: Partial<T>) {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of Object.keys(after)) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) out[key] = { from: a, to: b };
  }
  return out;
}
