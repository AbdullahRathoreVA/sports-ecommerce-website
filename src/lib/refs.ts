import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Human-facing references: AL-261005-K3P9 (orders; older orders use GL-), RFQ-261005-7XQ2 (leads).
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

export const newOrderNumber = () => `AL-${datePart()}-${suffix()}`;
export const newLeadNumber = () => `RFQ-${datePart()}-${suffix()}`;

function sign(purpose: string): string {
  const secret = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-secret-not-for-production");
  if (!secret) throw new Error("AUTH_SECRET is not set — customer links cannot be signed.");
  return createHmac("sha256", secret).update(purpose).digest("base64url").slice(0, 32);
}

function matches(expectedToken: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = Buffer.from(expectedToken);
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Signed token for the order confirmation link, so only the buyer (who
 * received the link) can view the order page — the number alone is not
 * enough.
 */
export const orderToken = (orderNumber: string) => sign(`order:${orderNumber}`);
export const verifyOrderToken = (orderNumber: string, token: string | undefined | null) => matches(orderToken(orderNumber), token);

/** Same idea for invoice links (view + PDF download) sent to the customer. */
export const invoiceToken = (invoiceNumber: string) => sign(`invoice:${invoiceNumber}`);
export const verifyInvoiceToken = (invoiceNumber: string, token: string | undefined | null) => matches(invoiceToken(invoiceNumber), token);
