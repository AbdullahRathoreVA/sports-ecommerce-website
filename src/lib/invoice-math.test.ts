import { test } from "node:test";
import assert from "node:assert/strict";
import { balanceCents, computeTotals, isOverdue, nextInvoiceNumber, parseMoney, statusForPaid } from "./invoice-math";

test("totals: lines, discount, shipping and tax on the discounted subtotal", () => {
  const t = computeTotals(
    [
      { quantity: 150, unitCents: 1850 },
      { quantity: 80, unitCents: 2400 },
    ],
    { discountCents: 10_000, shippingCents: 28_500, taxBasisPoints: 1000 },
  );
  assert.equal(t.subtotalCents, 469_500);
  assert.equal(t.taxCents, 45_950); // 10% of 459,500
  assert.equal(t.totalCents, 469_500 - 10_000 + 28_500 + 45_950);
});

test("totals: the client's sample invoice adds up to $7,050", () => {
  const t = computeTotals(
    [
      { quantity: 150, unitCents: 1850 },
      { quantity: 80, unitCents: 2400 },
      { quantity: 60, unitCents: 3250 },
      { quantity: 1, unitCents: 12_000 },
    ],
    { shippingCents: 28_500 },
  );
  assert.equal(t.subtotalCents, 676_500);
  assert.equal(t.totalCents, 705_000);
});

test("totals: discount can't exceed the subtotal and negatives are ignored", () => {
  const t = computeTotals([{ quantity: 2, unitCents: 500 }], { discountCents: 9_999, shippingCents: -50 });
  assert.equal(t.discountCents, 1000);
  assert.equal(t.totalCents, 0);
});

test("numbering is sequential per year", () => {
  assert.equal(nextInvoiceNumber(2026, null), "INV-2026-0001");
  assert.equal(nextInvoiceNumber(2026, "INV-2026-0041"), "INV-2026-0042");
  assert.equal(nextInvoiceNumber(2027, "INV-2026-0041"), "INV-2027-0001");
  assert.equal(nextInvoiceNumber(2026, "INV-2026-9999"), "INV-2026-10000");
});

test("status follows payments but never revives drafts or void invoices", () => {
  assert.equal(statusForPaid("SENT", 1000, 0), "SENT");
  assert.equal(statusForPaid("SENT", 1000, 400), "PARTIALLY_PAID");
  assert.equal(statusForPaid("PARTIALLY_PAID", 1000, 1000), "PAID");
  assert.equal(statusForPaid("PAID", 1000, 0), "SENT");
  assert.equal(statusForPaid("VOID", 1000, 1000), "VOID");
  assert.equal(statusForPaid("DRAFT", 1000, 1000), "DRAFT");
  assert.equal(balanceCents({ totalCents: 1000, paidCents: 1200 }), 0);
});

test("overdue only for unpaid, issued invoices past their due date", () => {
  const past = new Date(Date.now() - 86_400_000);
  assert.equal(isOverdue({ status: "SENT", dueDate: past }), true);
  assert.equal(isOverdue({ status: "PAID", dueDate: past }), false);
  assert.equal(isOverdue({ status: "DRAFT", dueDate: past }), false);
  assert.equal(isOverdue({ status: "SENT", dueDate: null }), false);
});

test("money input from people", () => {
  assert.equal(parseMoney("1,250.50"), 125_050);
  assert.equal(parseMoney("$18.5"), 1850);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney("1.234"), null);
  assert.equal(parseMoney(32.5), 3250);
});
