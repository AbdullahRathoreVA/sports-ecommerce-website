/**
 * Pure pricing functions, shared by the browser (instant feedback) and the
 * server (authoritative). The server recomputes every order total from the
 * database with these same functions; the client's numbers are never stored.
 *
 * All money is integer minor units (cents). No floats anywhere.
 */

export type PriceTier = { minQty: number; unitCents: number };

export function normaliseTiers(raw: unknown): PriceTier[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is PriceTier =>
        !!t &&
        typeof t === "object" &&
        Number.isInteger((t as PriceTier).minQty) &&
        Number.isInteger((t as PriceTier).unitCents) &&
        (t as PriceTier).minQty >= 1 &&
        (t as PriceTier).unitCents >= 0,
    )
    .sort((a, b) => a.minQty - b.minQty);
}

/** Unit price for a quantity: the highest tier whose minQty is met. */
export function unitPriceFor(tiers: PriceTier[], quantity: number): number | null {
  if (tiers.length === 0 || quantity < 1) return null;
  let price: number | null = null;
  for (const tier of tiers) if (quantity >= tier.minQty) price = tier.unitCents;
  // Below the first tier: no price exists for that quantity.
  return price;
}

/** Lowest unit price across tiers — the "from" price shown on cards. */
export function fromPrice(tiers: PriceTier[]): number | null {
  if (tiers.length === 0) return null;
  return Math.min(...tiers.map((t) => t.unitCents));
}

/** The next tier above the current quantity, to nudge bulk buyers. */
export function nextTier(tiers: PriceTier[], quantity: number): PriceTier | null {
  return tiers.find((t) => t.minQty > quantity) ?? null;
}

export function lineTotal(unitCents: number, quantity: number): number {
  return unitCents * quantity;
}

export type CartLineInput = { quantity: number; tiers: PriceTier[]; samplePriceCents: number | null; isSample: boolean };

/**
 * Price one cart line. Samples are a single unit at the sample price; bulk
 * lines use quantity tiers. Returns null when the line cannot be priced
 * (quantity below the first tier, or no sample price).
 */
export function priceLine(line: CartLineInput): { unitCents: number; totalCents: number } | null {
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 100_000) return null;
  if (line.isSample) {
    if (line.samplePriceCents == null || line.quantity !== 1) return null;
    return { unitCents: line.samplePriceCents, totalCents: line.samplePriceCents };
  }
  const unit = unitPriceFor(line.tiers, line.quantity);
  if (unit == null) return null;
  return { unitCents: unit, totalCents: lineTotal(unit, line.quantity) };
}

/** Savings versus the single-unit (first tier) price, for display. */
export function bulkSaving(tiers: PriceTier[], quantity: number): number {
  const base = tiers[0]?.unitCents;
  const unit = unitPriceFor(tiers, quantity);
  if (base == null || unit == null) return 0;
  return Math.max(0, (base - unit) * quantity);
}
