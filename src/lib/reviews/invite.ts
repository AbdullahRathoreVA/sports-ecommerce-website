import { createHash, randomBytes } from "node:crypto";

/**
 * Review invitation tokens: 32 random bytes, sent once in the link; only a
 * SHA-256 hash is stored, so a database leak can't be turned into links.
 * One use, and they expire.
 */
export const INVITE_DAYS = 60;

export function newInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(`review-invite:${token}`).digest("hex");
}

export const looksLikeToken = (t: unknown): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{40,60}$/.test(t);

export type InviteState = "valid" | "used" | "expired" | "opted_out";

export function inviteState(inv: { usedAt: Date | null; expiresAt: Date; optedOutAt: Date | null }, now = new Date()): InviteState {
  if (inv.optedOutAt) return "opted_out";
  if (inv.usedAt) return "used";
  if (inv.expiresAt.getTime() <= now.getTime()) return "expired";
  return "valid";
}

/** Orders a team can ask for a review: really delivered/shipped, not demo, buyer hasn't opted out. */
export const REVIEWABLE_ORDER_STATUSES = ["DELIVERED", "SHIPPED"] as const;
