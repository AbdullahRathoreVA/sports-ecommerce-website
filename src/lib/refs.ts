import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Human-facing references: GL-261005-K3P9 (orders), RFQ-261005-7XQ2 (leads).
 * Date prefix helps staff on the phone; a random suffix (no 0/O/1/I) avoids
 * guessable sequences that would leak order volume.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function suffix(length = 4) {
  let s = "";
  for (let i = 0; i < length; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

function datePart(d = new Date()) {
  return d.toISOString().slice(2, 10).replace(/-/g, "");
}

export const newOrderNumber = () => `GL-${datePart()}-${suffix()}`;
export const newLeadNumber = () => `RFQ-${datePart()}-${suffix()}`;

/**
 * Signed token for the order confirmation link, so only the buyer (who
 * received the link) can view the order page — the number alone is not
 * enough.
 */
export function orderToken(orderNumber: string): string {
  const secret = process.env.AUTH_SECRET ?? "dev-secret-not-for-production";
  return createHmac("sha256", secret).update(`order:${orderNumber}`).digest("base64url").slice(0, 32);
}

export function verifyOrderToken(orderNumber: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = Buffer.from(orderToken(orderNumber));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
