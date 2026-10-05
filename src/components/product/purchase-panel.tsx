"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, FileText, MessageCircle, Minus, Plus, ShoppingBag, Sparkles } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { openAssistant } from "@/components/assistant/bus";
import { nextTier, unitPriceFor, type PriceTier } from "@/lib/pricing";
import { formatMoney, cn } from "@/lib/utils";
import { track } from "@/lib/analytics/client";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    sku: string;
    image: string | null;
    purchaseMode: "QUOTE" | "CART" | "BOTH";
    currency: string;
    priceTiers: PriceTier[];
    samplePriceCents: number | null;
    moq: number;
    sizes: string[];
    category: string;
  };
  whatsapp: string;
};

/**
 * Three ways to buy, chosen by the product's purchase mode:
 *   sample — one unit at the sample price (BOTH, when a sample price exists)
 *   bulk   — quantity with live tier pricing (CART / BOTH)
 *   quote  — always available; carries product + quantity into the RFQ form
 */
export function PurchasePanel({ product, whatsapp }: Props) {
  const { add } = useCart();
  const canBuy = product.purchaseMode !== "QUOTE" && product.priceTiers.length > 0;
  const hasSample = product.purchaseMode === "BOTH" && product.samplePriceCents != null;
  const bulkMin = Math.max(product.moq, product.priceTiers.find((t) => t.minQty >= product.moq)?.minQty ?? product.moq);
  const [mode, setMode] = useState<"sample" | "bulk">(hasSample ? "sample" : "bulk");
  const [qty, setQty] = useState(bulkMin);
  // Default to a common adult size (M), not the first in the list (often a youth size).
  const [size, setSize] = useState<string>(() => {
    const real = product.sizes.filter((s) => s !== "Made to measure");
    return ["M", "L", "S"].find((x) => real.includes(x)) ?? real[Math.floor(real.length / 2)] ?? "";
  });
  const [added, setAdded] = useState(false);

  const unit = useMemo(() => (mode === "sample" ? product.samplePriceCents : unitPriceFor(product.priceTiers, qty)), [mode, product, qty]);
  const total = unit != null ? unit * (mode === "sample" ? 1 : qty) : null;
  const next = mode === "bulk" ? nextTier(product.priceTiers, qty) : null;
  const quoteHref = `/quote?product=${product.slug}${mode === "bulk" ? `&qty=${qty}` : ""}`;
  const waLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name} (${product.sku}). Quantity: ${mode === "bulk" ? qty : "sample"}.`)}`
    : null;

  function addToCart() {
    if (!canBuy || unit == null) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      image: product.image,
      size: size || null,
      isSample: mode === "sample",
      quantity: mode === "sample" ? 1 : qty,
      tiers: product.priceTiers,
      samplePriceCents: product.samplePriceCents,
      moq: product.moq,
      currency: product.currency,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  }

  return (
    <div className="space-y-5">
      {canBuy && (
        <div className="rounded-[var(--radius-card)] border hairline bg-surface p-4 sm:p-5">
          {hasSample && (
            <div role="radiogroup" aria-label="Order type" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
              {(["sample", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-11 rounded-lg text-sm font-semibold transition-colors",
                    mode === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  {m === "sample" ? "Buy a sample" : "Bulk order"}
                </button>
              ))}
            </div>
          )}

          <div className={cn("flex items-end justify-between gap-3", hasSample && "mt-4")}>
            <div>
              <p className="text-sm text-muted">{mode === "sample" ? "Sample price" : "Unit price"}</p>
              <p className="mt-0.5 text-3xl font-semibold tracking-tight">{unit != null ? formatMoney(unit, product.currency) : "—"}</p>
            </div>
            {mode === "bulk" && total != null && (
              <div className="text-right">
                <p className="text-sm text-muted">Total ({qty} units)</p>
                <p className="mt-0.5 text-lg font-semibold">{formatMoney(total, product.currency)}</p>
              </div>
            )}
          </div>

          {mode === "bulk" && (
            <div className="mt-4">
              <label htmlFor="qty" className="text-sm font-medium">
                Quantity <span className="text-subtle">(minimum {bulkMin})</span>
              </label>
              <div className="mt-2 flex h-12 items-stretch overflow-hidden rounded-[var(--radius-control)] border hairline">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(bulkMin, q - (q > 50 ? 10 : 1)))} className="grid w-12 place-items-center hover:bg-surface-2">
                  <Minus className="h-4 w-4" aria-hidden />
                </button>
                <input
                  id="qty"
                  type="number"
                  inputMode="numeric"
                  min={bulkMin}
                  max={100000}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(100000, Math.round(Number(e.target.value) || 0))))}
                  onBlur={() => setQty((q) => Math.max(bulkMin, q))}
                  className="w-full border-x hairline text-center text-[16px] font-semibold outline-none"
                />
                <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + (q >= 50 ? 10 : 1))} className="grid w-12 place-items-center hover:bg-surface-2">
                  <Plus className="h-4 w-4" aria-hidden />
                </button>
              </div>
              {next && (
                <button
                  type="button"
                  onClick={() => setQty(next.minQty)}
                  className="mt-2 text-left text-sm text-accent hover:underline"
                >
                  Order {next.minQty}+ and pay {formatMoney(next.unitCents, product.currency)} per unit →
                </button>
              )}
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="mt-4">
              <label htmlFor="size" className="text-sm font-medium">
                {mode === "bulk" ? "Size (mixed sizes? note it at checkout)" : "Size"}
              </label>
              <select
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="mt-2 h-12 w-full rounded-[var(--radius-control)] border hairline bg-surface px-3 text-[16px] outline-none focus:border-accent"
              >
                {product.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={addToCart}
            disabled={unit == null}
            className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-white text-[15px] font-semibold text-ink transition-colors hover:bg-white/90 disabled:opacity-50"
            style={{ height: 52 }}
          >
            {added ? <Check className="h-5 w-5" aria-hidden /> : <ShoppingBag className="h-5 w-5" aria-hidden />}
            {added ? "Added to cart" : mode === "sample" ? "Add sample to cart" : "Add to cart"}
          </button>
          {added && (
            <Link href="/cart" className="mt-2 block text-center text-sm font-semibold text-accent hover:underline">
              View cart & checkout →
            </Link>
          )}
          <p className="mt-3 text-xs text-subtle">
            Standard design. For your own branding, colours or sizes per player, request a quote.
          </p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Link
          href={quoteHref}
          onClick={() => track("quote_start", { productId: product.id, label: product.name })}
          className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-[15px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover sm:col-span-2"
        >
          <FileText className="h-[18px] w-[18px]" aria-hidden /> {canBuy ? "Customise & request a quote" : "Request a quote"}
        </Link>
        {waLink ? (
          <a
            href={waLink}
            data-track="whatsapp_click"
            data-product-id={product.id}
            data-track-label={`Product WhatsApp: ${product.name}`}
            className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border hairline bg-surface text-[15px] font-semibold text-fg hover:border-[#1fae4b]"
          >
            <MessageCircle className="h-[18px] w-[18px] text-[#1fae4b]" aria-hidden /> WhatsApp us
          </a>
        ) : (
          <Link href={`/contact?product=${product.slug}`} className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border hairline bg-surface text-[15px] font-semibold text-fg hover:border-white/35">
            Ask a question
          </Link>
        )}
        <button
          type="button"
          onClick={() => openAssistant({ productSlug: product.slug, question: `Tell me about the ${product.name} — materials, MOQ and customisation.` })}
          className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border hairline bg-surface text-[15px] font-semibold text-fg hover:border-accent"
        >
          <Sparkles className="h-[18px] w-[18px] text-accent" aria-hidden /> Ask AI
        </button>
      </div>
    </div>
  );
}

/** Sticky bottom bar for phones: price + the single most useful action. */
export function MobileProductBar({ name, fromCents, currency, canBuy, slug }: { name: string; fromCents: number | null; currency: string; canBuy: boolean; slug: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-paper/95 px-4 pt-2.5 backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-muted">{name}</p>
          <p className="text-[15px] font-semibold">{fromCents != null ? `From ${formatMoney(fromCents, currency)}` : "Price on request"}</p>
        </div>
        {canBuy ? (
          <a href="#buy" className="flex h-12 items-center rounded-[var(--radius-control)] bg-white px-5 text-[15px] font-semibold text-ink">
            Buy / sample
          </a>
        ) : null}
        <Link href={`/quote?product=${slug}`} className="flex h-12 items-center rounded-[var(--radius-control)] bg-accent px-5 text-[15px] font-semibold text-accent-ink" data-track="quote_start" data-track-label="Mobile product bar">
          Quote
        </Link>
      </div>
    </div>
  );
}
