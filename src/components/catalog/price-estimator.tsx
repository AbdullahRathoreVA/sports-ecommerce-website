"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Clock, Minus, PackageCheck, Plus, TrendingDown } from "lucide-react";
import { nextTier, unitPriceFor, type PriceTier } from "@/lib/pricing";
import { formatMoney, cn } from "@/lib/utils";

export type EstimatorProduct = {
  slug: string;
  name: string;
  category: string;
  image: string | null;
  tiers: PriceTier[];
  moq: number;
  currency: string;
  leadMin: number | null;
  leadMax: number | null;
  sampleCents: number | null;
};

const QUICK = [25, 50, 100, 250, 500];

/** Tweens a number so price changes feel live rather than jumpy. */
function useTween(target: number, ms = 450) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = a + (target - a) * eased;
      setValue(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

export function PriceEstimator({ products, indicative }: { products: EstimatorProduct[]; indicative: boolean }) {
  const [slug, setSlug] = useState(products[0]?.slug ?? "");
  const p = products.find((x) => x.slug === slug) ?? products[0];
  const [qty, setQty] = useState(() => Math.max(50, p?.moq ?? 1));

  const max = useMemo(() => Math.max(1000, (p?.tiers.at(-1)?.minQty ?? 0) * 2), [p]);
  const unit = p ? unitPriceFor(p.tiers, qty) : null;
  const belowMoq = p ? qty < p.moq : false;
  const total = unit != null && !belowMoq ? unit * qty : 0;
  const next = p ? nextTier(p.tiers, qty) : null;
  const firstTier = p?.tiers[0];
  const saving = unit != null && firstTier && !belowMoq ? (firstTier.unitCents - unit) * qty : 0;

  const unitTween = useTween(unit ?? 0);
  const totalTween = useTween(total);

  if (!p) return null;
  const topPrice = Math.max(...p.tiers.map((t) => t.unitCents));
  const setQ = (n: number) => setQty(Math.min(100_000, Math.max(1, Math.round(n) || 1)));

  return (
    <div className="grid overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-black/[0.06] lg:grid-cols-[1.15fr_1fr]">
      {/* Inputs (min-w-0: the scrolling product strip must not widen the grid column) */}
      <div className="min-w-0 p-5 sm:p-8">
        <p className="label text-subtle">01 / Pick a product</p>
        <ul className="scrollbar-none -mx-5 mt-4 flex gap-2.5 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8" role="radiogroup" aria-label="Product">
          {products.map((x) => (
            <li key={x.slug} className="shrink-0">
              <button
                type="button"
                role="radio"
                aria-checked={x.slug === p.slug}
                onClick={() => {
                  setSlug(x.slug);
                  setQty((q) => Math.max(q, x.moq));
                }}
                className={cn(
                  "flex w-36 flex-col overflow-hidden rounded-md text-left ring-1 transition",
                  x.slug === p.slug ? "bg-ink text-white ring-ink" : "bg-surface-2 ring-black/[0.06] hover:ring-black/20",
                )}
              >
                <span className="relative block aspect-[4/3] bg-white/5">
                  {x.image && <Image src={x.image} alt="" fill sizes="144px" className="object-cover" />}
                </span>
                <span className="line-clamp-2 min-h-[2.6rem] px-2.5 py-2 text-[12.5px] font-semibold leading-snug">{x.name}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="label mt-8 text-subtle">02 / How many pieces?</p>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => setQ(qty - (qty > 100 ? 25 : 5))} aria-label="Fewer" className="grid h-12 w-12 shrink-0 place-items-center rounded-md ring-1 ring-black/10 hover:bg-surface-2">
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <label className="sr-only" htmlFor="est-qty">Quantity</label>
          <input
            id="est-qty"
            type="number"
            inputMode="numeric"
            min={1}
            value={qty}
            onChange={(e) => setQ(Number(e.target.value))}
            className="h-12 w-full min-w-0 rounded-md bg-surface-2 text-center font-display text-3xl tabular-nums outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-accent"
          />
          <button type="button" onClick={() => setQ(qty + (qty >= 100 ? 25 : 5))} aria-label="More" className="grid h-12 w-12 shrink-0 place-items-center rounded-md ring-1 ring-black/10 hover:bg-surface-2">
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={Math.min(qty, max)}
          onChange={(e) => setQ(Number(e.target.value))}
          aria-label="Quantity slider"
          className="mt-5 w-full accent-[var(--color-accent)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((n) => (
            <button key={n} type="button" onClick={() => setQ(n)} className={cn("h-9 rounded-full px-3.5 text-sm font-semibold ring-1", qty === n ? "bg-accent text-white ring-accent" : "ring-black/10 hover:ring-black/30")}>
              {n}
            </button>
          ))}
        </div>

        {/* Tier bars: taller = more per piece; the active tier glows. */}
        <p className="label mt-8 text-subtle">Price breaks</p>
        <ol className="mt-4 flex h-28 items-end gap-2">
          {p.tiers.map((t, i) => {
            const active = unit === t.unitCents && !belowMoq;
            return (
              <li key={t.minQty} className="flex flex-1 flex-col items-center gap-1.5">
                <span className={cn("text-[11px] font-semibold tabular-nums", active ? "text-accent" : "text-subtle")}>{formatMoney(t.unitCents, p.currency)}</span>
                <button
                  type="button"
                  onClick={() => setQ(Math.max(t.minQty, p.moq))}
                  aria-label={`${t.minQty}+ pieces at ${formatMoney(t.unitCents, p.currency)} each`}
                  className={cn("w-full rounded-t-sm transition-all duration-500", active ? "bg-accent shadow-[0_0_24px_rgba(225,29,38,0.45)]" : "bg-black/[0.09] hover:bg-black/20")}
                  style={{ height: `${28 + (t.unitCents / topPrice) * 52}px`, transitionDelay: `${i * 40}ms` }}
                />
                <span className="text-[11px] tabular-nums text-muted">{t.minQty}+</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Result */}
      <div className="on-dark relative flex min-w-0 flex-col overflow-hidden bg-ink p-5 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-[90px]" aria-hidden />
        <p className="label relative text-white/45">Your estimate · {p.category}</p>
        <p className="relative mt-2 truncate text-lg font-semibold">{p.name}</p>

        {belowMoq ? (
          <div className="relative mt-8 rounded-md bg-white/[0.06] p-4 ring-1 ring-white/10">
            <p className="font-semibold">Minimum order is {p.moq} pieces.</p>
            <p className="mt-1 text-sm text-white/60">
              {p.sampleCents != null ? `Want to check quality first? A single sample is ${formatMoney(p.sampleCents, p.currency)}.` : "Ask us about a sample before bulk."}
            </p>
            <button type="button" onClick={() => setQ(p.moq)} className="mt-3 text-sm font-semibold text-accent hover:underline">
              Set to {p.moq} pieces
            </button>
          </div>
        ) : (
          <div className="relative mt-6 grid grid-cols-2 gap-4" aria-live="polite">
            <div>
              <p className="text-sm text-white/50">Per piece</p>
              <p className="font-display mt-1 text-[clamp(2.2rem,5vw,3.2rem)] leading-none tabular-nums">{unit != null ? formatMoney(Math.round(unitTween), p.currency) : "On request"}</p>
            </div>
            <div>
              <p className="text-sm text-white/50">{qty.toLocaleString()} pieces</p>
              <p className="font-display mt-1 text-[clamp(2.2rem,5vw,3.2rem)] leading-none text-accent tabular-nums">{unit != null ? formatMoney(Math.round(totalTween), p.currency) : "—"}</p>
            </div>
          </div>
        )}

        <ul className="relative mt-7 space-y-2.5 text-sm">
          {saving > 0 && (
            <li className="flex items-center gap-2.5 text-emerald-300">
              <TrendingDown className="h-4 w-4 shrink-0" aria-hidden /> You save {formatMoney(saving, p.currency)} with bulk pricing
            </li>
          )}
          {next && !belowMoq && unit != null && (
            <li className="flex items-start gap-2.5 text-white/75">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span>
                Add {(next.minQty - qty).toLocaleString()} more to pay {formatMoney(next.unitCents, p.currency)} each{" "}
                <button type="button" onClick={() => setQ(next.minQty)} className="font-semibold text-white underline underline-offset-2">
                  try it
                </button>
              </span>
            </li>
          )}
          {p.leadMin != null && (
            <li className="flex items-center gap-2.5 text-white/75">
              <Clock className="h-4 w-4 shrink-0 text-accent" aria-hidden /> Lead time {p.leadMin}
              {p.leadMax && p.leadMax !== p.leadMin ? `–${p.leadMax}` : ""} days
            </li>
          )}
        </ul>

        <div className="relative mt-auto grid gap-2 pt-8 sm:grid-cols-2">
          <Link
            href={`/quote?product=${encodeURIComponent(p.slug)}&qty=${Math.max(qty, p.moq)}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent font-semibold text-white hover:bg-accent-hover"
            data-track="cta_click"
            data-track-label="Estimator: exact quote"
          >
            Get exact quote <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href={`/products/${p.slug}`} className="inline-flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-white/20 font-semibold hover:bg-white/10">
            View product
          </Link>
        </div>
        <p className="relative mt-4 text-xs text-white/40">
          {indicative ? "Indicative prices while our catalogue is being finalised — " : ""}Every price is confirmed in writing with your quote. Shipping is quoted separately.
        </p>
      </div>
    </div>
  );
}
