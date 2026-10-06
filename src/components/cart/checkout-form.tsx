"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Lock } from "lucide-react";
import { useCart } from "./cart-context";
import { Choice, Field, inputClass } from "@/components/forms/field";
import { COUNTRIES, TOP_COUNTRIES } from "@/lib/countries";
import { priceLine } from "@/lib/pricing";
import { formatMoney, cn } from "@/lib/utils";
import { sessionId, track } from "@/lib/analytics/client";

type Method = { id: string; label: string; detail: string };

export function CheckoutForm({ paymentMethods, shippingNote }: { paymentMethods: Method[]; shippingNote: string }) {
  const { lines, ready, subtotalCents, clear } = useCart();
  const router = useRouter();
  const [method, setMethod] = useState(paymentMethods[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [priceChange, setPriceChange] = useState<{ totalCents: number } | null>(null);
  const tracked = useRef(false);
  const currency = lines[0]?.currency ?? "USD";

  useEffect(() => {
    if (ready && lines.length && !tracked.current) {
      tracked.current = true;
      track("checkout_start", { value: subtotalCents, productId: lines[0]?.productId });
    }
  }, [ready, lines, subtotalCents]);

  if (ready && lines.length === 0) {
    return (
      <div className="mt-8 rounded-[var(--radius-card)] border hairline bg-surface p-8 text-center">
        <p className="text-lg font-semibold">Your cart is empty</p>
        <Link href="/products" className="mt-4 inline-flex h-12 items-center rounded-[var(--radius-control)] bg-ink px-6 font-semibold text-white">
          Browse products
        </Link>
      </div>
    );
  }

  async function submit(form: HTMLFormElement, acceptTotal?: number) {
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const e: Record<string, string> = {};
    if (get("name").length < 2) e["contact.name"] = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) e["contact.email"] = "Enter a valid email address";
    if (get("line1").length < 3) e["shipping.line1"] = "Enter your street address";
    if (get("city").length < 2) e["shipping.city"] = "Enter your city";
    if (!get("country")) e["shipping.country"] = "Choose your country";
    if (fd.get("acceptTerms") !== "on") e.acceptTerms = "Please accept the terms of sale to place your order";
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(Object.keys(e)[0]!.split(".")[1]!)?.focus();
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({ productId: l.productId, size: l.size, isSample: l.isSample, quantity: l.quantity })),
          expectedTotalCents: acceptTotal ?? subtotalCents,
          contact: { name: get("name"), email: get("email"), phone: get("phone") || undefined, company: get("company") || undefined },
          shipping: {
            line1: get("line1"),
            line2: get("line2") || undefined,
            city: get("city"),
            region: get("region") || undefined,
            postal: get("postal") || undefined,
            country: get("country"),
          },
          paymentMethod: method,
          acceptTerms: fd.get("acceptTerms") === "on",
          note: get("note") || undefined,
          sessionId: sessionId(),
          website: get("website"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 && data.detail?.totalCents != null) {
        setPriceChange({ totalCents: data.detail.totalCents });
        return;
      }
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        throw new Error(data.error ?? "Something went wrong.");
      }
      clear();
      router.push(`/order/${data.orderNumber}?t=${data.token}&new=1`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <div className="space-y-8">
        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">Contact</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name" error={errors["contact.name"]}>
              <input id="name" name="name" autoComplete="name" maxLength={80} className={inputClass} aria-invalid={!!errors["contact.name"]} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors["contact.email"]} hint="Order confirmation goes here.">
              <input id="email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={120} className={inputClass} aria-invalid={!!errors["contact.email"]} />
            </Field>
            <Field label="Phone / WhatsApp" htmlFor="phone" optional error={errors["contact.phone"]}>
              <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} className={inputClass} />
            </Field>
            <Field label="Company / team" htmlFor="company" optional>
              <input id="company" name="company" autoComplete="organization" maxLength={120} className={inputClass} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-lg font-semibold">Delivery address</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Street address" htmlFor="line1" error={errors["shipping.line1"]} className="sm:col-span-2">
              <input id="line1" name="line1" autoComplete="address-line1" maxLength={160} className={inputClass} aria-invalid={!!errors["shipping.line1"]} />
            </Field>
            <Field label="Apartment, unit, building" htmlFor="line2" optional className="sm:col-span-2">
              <input id="line2" name="line2" autoComplete="address-line2" maxLength={160} className={inputClass} />
            </Field>
            <Field label="City" htmlFor="city" error={errors["shipping.city"]}>
              <input id="city" name="city" autoComplete="address-level2" maxLength={80} className={inputClass} aria-invalid={!!errors["shipping.city"]} />
            </Field>
            <Field label="State / region" htmlFor="region" optional>
              <input id="region" name="region" autoComplete="address-level1" maxLength={80} className={inputClass} />
            </Field>
            <Field label="Postal code" htmlFor="postal" optional>
              <input id="postal" name="postal" autoComplete="postal-code" maxLength={20} className={inputClass} />
            </Field>
            <Field label="Country" htmlFor="country" error={errors["shipping.country"]}>
              <select id="country" name="country" autoComplete="country-name" defaultValue="" className={inputClass} aria-invalid={!!errors["shipping.country"]}>
                <option value="">Select…</option>
                <optgroup label="Most common">
                  {TOP_COUNTRIES.map((c) => (
                    <option key={`t-${c}`} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All countries">
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
          </div>
          <p className="text-sm text-muted">{shippingNote}</p>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-semibold">Payment</legend>
          {paymentMethods.map((m) => (
            <Choice key={m.id} name="payment" value={m.id} checked={method === m.id} onChange={setMethod}>
              <span>
                <span className="block font-semibold">{m.label}</span>
                <span className="block text-sm text-muted">{m.detail}</span>
              </span>
            </Choice>
          ))}
          <p className="flex items-center gap-2 text-sm text-muted">
            <Lock className="h-4 w-4" aria-hidden /> No card details are entered on this site.
          </p>
        </fieldset>

        <Field label="Order notes" htmlFor="note" optional hint="Mixed sizes, delivery instructions, anything we should know.">
          <textarea id="note" name="note" rows={3} maxLength={2000} className={cn(inputClass, "h-auto py-3")} />
        </Field>
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      </div>

      <aside className="h-fit space-y-4 rounded-[var(--radius-card)] border hairline bg-surface p-5 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
        <p className="font-semibold">Order summary</p>
        <ul className="space-y-3">
          {lines.map((l) => {
            const p = priceLine(l);
            return (
              <li key={l.key} className="flex gap-3 text-sm">
                <span className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                  {l.image && <Image src={l.image} alt="" fill sizes="48px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.name}</span>
                  <span className="text-muted">
                    {l.isSample ? "Sample" : `${l.quantity} units`}
                    {l.size ? ` · ${l.size}` : ""}
                  </span>
                </span>
                <span className="font-semibold">{p ? formatMoney(p.totalCents, l.currency) : "—"}</span>
              </li>
            );
          })}
        </ul>
        <dl className="space-y-1.5 border-t hairline pt-4 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-semibold">{formatMoney(subtotalCents, currency)}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-muted">Freight</dt>
            <dd className="text-muted">Quoted separately</dd>
          </div>
        </dl>
        {priceChange && (
          <div className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200 ring-1 ring-amber-500/30" role="alert">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden /> Prices were updated
            </p>
            <p className="mt-1">The current total is {formatMoney(priceChange.totalCents, currency)}.</p>
            <button
              type="button"
              className="mt-3 h-11 w-full rounded-lg bg-amber-900 font-semibold text-white"
              onClick={(e) => {
                const form = (e.currentTarget.closest("form") as HTMLFormElement)!;
                const total = priceChange.totalCents;
                setPriceChange(null);
                void submit(form, total);
              }}
            >
              Place order at the new total
            </button>
          </div>
        )}
        {serverError && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            {serverError}
          </p>
        )}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border hairline p-3 text-sm">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" aria-describedby="terms-error" />
          <span className="text-muted">
            I agree to the <Link href="/terms" target="_blank" className="font-semibold text-fg underline">terms of sale</Link>. I understand the order is confirmed by email before payment.
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="terms-error" className="text-sm text-danger" role="alert">
            {errors.acceptTerms}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !ready}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-[15px] font-semibold text-accent-ink disabled:opacity-70"
          style={{ height: 52 }}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Place order
        </button>
        <p className="text-xs text-subtle">Order confirmations and updates are sent by email so you have a written record.</p>
      </aside>
    </form>
  );
}
