/**
 * Invoice arithmetic — pure functions, no database, so they are unit-tested.
 * Money is always integer cents; tax is basis points (1700 = 17%).
 */

export type LineInput = { quantity: number; unitCents: number };

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

export function lineTotal(l: LineInput): number {
  return Math.max(0, Math.round(l.quantity)) * Math.max(0, Math.round(l.unitCents));
}

/** Tax is charged on (subtotal − discount); shipping is not taxed. */
export function computeTotals(lines: LineInput[], opts: { discountCents?: number; shippingCents?: number; taxBasisPoints?: number } = {}): Totals {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const discountCents = Math.min(Math.max(0, Math.round(opts.discountCents ?? 0)), subtotalCents);
  const shippingCents = Math.max(0, Math.round(opts.shippingCents ?? 0));
  const taxCents = Math.round(((subtotalCents - discountCents) * Math.max(0, opts.taxBasisPoints ?? 0)) / 10_000);
  return { subtotalCents, discountCents, shippingCents, taxCents, totalCents: subtotalCents - discountCents + shippingCents + taxCents };
}

export const balanceCents = (inv: { totalCents: number; paidCents: number }) => Math.max(0, inv.totalCents - inv.paidCents);

/** INV-2026-0001, sequential per year. `last` is the highest number issued that year (or null). */
export function nextInvoiceNumber(year: number, last: string | null): string {
  const m = last ? new RegExp(`^INV-${year}-(\\d+)$`).exec(last) : null;
  const next = m ? Number(m[1]) + 1 : 1;
  return `INV-${year}-${String(next).padStart(4, "0")}`;
}

export type InvoiceState = "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "VOID";

/** Status after payments change: never revives a draft or a void invoice. */
export function statusForPaid(current: InvoiceState, totalCents: number, paidCents: number): InvoiceState {
  if (current === "VOID" || current === "DRAFT") return current;
  if (paidCents >= totalCents && totalCents > 0) return "PAID";
  if (paidCents > 0) return "PARTIALLY_PAID";
  return "SENT";
}

export function isOverdue(inv: { status: string; dueDate: Date | null }, now = new Date()): boolean {
  return (inv.status === "SENT" || inv.status === "PARTIALLY_PAID") && !!inv.dueDate && inv.dueDate.getTime() < now.getTime();
}

/** Dollars typed by a person ("1,250.50") → cents. Returns null when it isn't a number. */
export function parseMoney(input: string | number): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input * 100) : null;
  const clean = input.replace(/[,\s$]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}
