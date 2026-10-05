"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "./cart-context";
import { nextTier, priceLine } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";

export function CartView() {
  const { lines, ready, subtotalCents, setQuantity, remove } = useCart();
  const currency = lines[0]?.currency ?? "USD";

  if (!ready) return <div className="mt-10 h-40 animate-pulse rounded-[var(--radius-card)] bg-surface-2" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="mt-8 rounded-[var(--radius-card)] border hairline bg-surface p-8 text-center sm:p-14">
        <ShoppingBag className="mx-auto h-10 w-10 text-subtle" aria-hidden />
        <p className="mt-4 text-lg font-semibold">Your cart is empty</p>
        <p className="mx-auto mt-1 max-w-md text-muted">Order a sample or a small run online — or request a quote for custom and bulk work.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/products" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-white px-6 font-semibold text-ink">
            Browse products
          </Link>
          <Link href="/quote" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] border hairline px-6 font-semibold">
            Request a quote
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      <ul className="divide-y hairline border-y hairline">
        {lines.map((l) => {
          const price = priceLine(l);
          const next = l.isSample ? null : nextTier(l.tiers, l.quantity);
          return (
            <li key={l.key} className="flex gap-4 py-5">
              <Link href={`/products/${l.slug}`} className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-28">
                {l.image && <Image src={l.image} alt="" fill sizes="112px" className="object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${l.slug}`} className="font-semibold leading-snug hover:text-accent">
                      {l.name}
                    </Link>
                    <p className="mt-0.5 text-sm text-muted">
                      {l.isSample ? "Sample" : "Bulk"}
                      {l.size ? ` · ${l.size}` : ""} · <span className="font-mono text-xs">{l.sku}</span>
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">{price ? formatMoney(price.totalCents, l.currency) : "—"}</p>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  {l.isSample ? (
                    <p className="text-sm text-muted">1 sample unit</p>
                  ) : (
                    <div className="flex h-11 items-stretch overflow-hidden rounded-[var(--radius-control)] border hairline">
                      <button type="button" aria-label={`Decrease ${l.name}`} onClick={() => setQuantity(l.key, Math.max(l.moq, l.quantity - 1))} className="grid w-11 place-items-center hover:bg-surface-2">
                        <Minus className="h-4 w-4" aria-hidden />
                      </button>
                      <input
                        aria-label={`Quantity of ${l.name}`}
                        type="number"
                        inputMode="numeric"
                        min={l.moq}
                        value={l.quantity}
                        onChange={(e) => setQuantity(l.key, Math.max(1, Number(e.target.value) || 1))}
                        onBlur={() => l.quantity < l.moq && setQuantity(l.key, l.moq)}
                        className="w-16 border-x hairline text-center text-[16px] font-semibold outline-none"
                      />
                      <button type="button" aria-label={`Increase ${l.name}`} onClick={() => setQuantity(l.key, l.quantity + 1)} className="grid w-11 place-items-center hover:bg-surface-2">
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => remove(l.key)} className="inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-sm text-muted hover:text-danger">
                    <Trash2 className="h-4 w-4" aria-hidden /> Remove
                  </button>
                </div>
                {price && !l.isSample && (
                  <p className="mt-2 text-xs text-subtle">
                    {formatMoney(price.unitCents, l.currency)} per unit
                    {next && (
                      <>
                        {" "}· <button type="button" className="text-accent hover:underline" onClick={() => setQuantity(l.key, next.minQty)}>
                          {next.minQty}+ units: {formatMoney(next.unitCents, l.currency)} each
                        </button>
                      </>
                    )}
                  </p>
                )}
                {!l.isSample && l.quantity < l.moq && <p className="mt-1 text-xs text-danger">Minimum for bulk orders is {l.moq} units.</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-[var(--radius-card)] border hairline bg-surface p-5 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
        <dl className="space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-semibold">{formatMoney(subtotalCents, currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Freight</dt>
            <dd className="text-muted">Quoted after confirmation</dd>
          </div>
        </dl>
        <Link
          href="/checkout"
          className="mt-5 flex h-13 items-center justify-center rounded-[var(--radius-control)] bg-white text-[15px] font-semibold text-ink"
          style={{ height: 52 }}
          data-track="checkout_start"
          data-track-label="Cart"
        >
          Checkout
        </Link>
        <p className="mt-3 text-xs text-subtle">No payment is taken online. We confirm your order and send payment details.</p>
      </aside>
    </div>
  );
}
