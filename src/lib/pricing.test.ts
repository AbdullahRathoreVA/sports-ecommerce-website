import { test } from "node:test";
import assert from "node:assert/strict";
import { bulkSaving, fromPrice, nextTier, normaliseTiers, priceLine, unitPriceFor } from "./pricing";

const tiers = [
  { minQty: 1, unitCents: 3800 },
  { minQty: 10, unitCents: 1900 },
  { minQty: 50, unitCents: 1350 },
];

test("unit price picks the highest tier reached", () => {
  assert.equal(unitPriceFor(tiers, 1), 3800);
  assert.equal(unitPriceFor(tiers, 9), 3800);
  assert.equal(unitPriceFor(tiers, 10), 1900);
  assert.equal(unitPriceFor(tiers, 49), 1900);
  assert.equal(unitPriceFor(tiers, 50), 1350);
  assert.equal(unitPriceFor(tiers, 5000), 1350);
});

test("no price below the first tier or for empty tiers", () => {
  assert.equal(unitPriceFor([{ minQty: 30, unitCents: 1000 }], 10), null);
  assert.equal(unitPriceFor([], 10), null);
  assert.equal(unitPriceFor(tiers, 0), null);
});

test("from price is the lowest tier", () => {
  assert.equal(fromPrice(tiers), 1350);
  assert.equal(fromPrice([]), null);
});

test("next tier nudges toward bulk", () => {
  assert.deepEqual(nextTier(tiers, 5), { minQty: 10, unitCents: 1900 });
  assert.equal(nextTier(tiers, 60), null);
});

test("normalise drops malformed tiers and sorts", () => {
  const out = normaliseTiers([
    { minQty: 50, unitCents: 1000 },
    { minQty: 1, unitCents: 2000 },
    { minQty: 0, unitCents: 10 },
    { minQty: 5, unitCents: 12.5 },
    "junk",
    null,
  ]);
  assert.deepEqual(out, [
    { minQty: 1, unitCents: 2000 },
    { minQty: 50, unitCents: 1000 },
  ]);
});

test("sample lines are exactly one unit at the sample price", () => {
  assert.deepEqual(priceLine({ quantity: 1, tiers, samplePriceCents: 4200, isSample: true }), {
    unitCents: 4200,
    totalCents: 4200,
  });
  assert.equal(priceLine({ quantity: 2, tiers, samplePriceCents: 4200, isSample: true }), null);
  assert.equal(priceLine({ quantity: 1, tiers, samplePriceCents: null, isSample: true }), null);
});

test("bulk lines use integer cents and reject bad quantities", () => {
  assert.deepEqual(priceLine({ quantity: 25, tiers, samplePriceCents: null, isSample: false }), {
    unitCents: 1900,
    totalCents: 47500,
  });
  assert.equal(priceLine({ quantity: 2.5, tiers, samplePriceCents: null, isSample: false }), null);
  assert.equal(priceLine({ quantity: -3, tiers, samplePriceCents: null, isSample: false }), null);
  assert.equal(priceLine({ quantity: 1_000_000, tiers, samplePriceCents: null, isSample: false }), null);
});

test("bulk saving compares against the single-unit price", () => {
  assert.equal(bulkSaving(tiers, 50), (3800 - 1350) * 50);
  assert.equal(bulkSaving(tiers, 1), 0);
});
