"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { sessionId, track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const SKIP = /^\/(quote|contact|checkout|cart|account|design-studio|track|order|reviews\/new|login)/;
const PRODUCT = /^\/products\/(?!c\/)[^/]+$/;
const WEEK = 7 * 86_400_000;

const read = (k: string, store: Storage | null) => {
  try {
    return store?.getItem(k) ?? null;
  } catch {
    return null;
  }
};
const write = (k: string, v: string, store: Storage | null) => {
  try {
    store?.setItem(k, v);
  } catch {
    /* private mode */
  }
};

/**
 * "Want prices for your order?" — a small, polite offer shown only to visitors who are clearly
 * interested (two product pages, or a while on one), never on the quote/contact/checkout pages,
 * at most once a week, and never again after they send it. Name + email or WhatsApp is enough:
 * the visitor becomes a lead with their whole visit attached.
 */
export function PriceOffer() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", quantity: "" });
  const [product, setProduct] = useState<{ slug?: string; name?: string }>({});

  useEffect(() => {
    const local = typeof window !== "undefined" ? window.localStorage : null;
    const session = typeof window !== "undefined" ? window.sessionStorage : null;
    if (read("po-done", local)) return;
    const dismissed = Number(read("po-dismissed", local) || 0);
    if (Date.now() - dismissed < WEEK) return;
    if (SKIP.test(pathname)) return;
    const onProduct = PRODUCT.test(pathname);
    if (onProduct) {
      const seen = new Set((read("po-products", session) ?? "").split(",").filter(Boolean));
      seen.add(pathname);
      write("po-products", [...seen].join(","), session);
    }
    const viewed = (read("po-products", session) ?? "").split(",").filter(Boolean).length;
    // Interest: a second product page (after a short read), or 40 s on one product page.
    const delay = viewed >= 2 ? 12_000 : onProduct ? 40_000 : -1;
    if (delay < 0) return;
    const t = window.setTimeout(() => {
      // Never on top of the chat or another dialog.
      if (document.querySelector('[aria-modal="true"]')) return;
      setProduct(onProduct ? { slug: pathname.split("/").pop(), name: document.querySelector("h1")?.textContent?.trim() } : {});
      setShow(true);
      track("cta_click", { label: "Price offer shown" });
    }, delay);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const close = () => {
    setShow(false);
    if (state !== "done") write("po-dismissed", String(Date.now()), window.localStorage);
  };

  if (!show || SKIP.test(pathname)) return null;
  return (
    <aside
      role="dialog"
      aria-label="Get prices for your order"
      className="on-dark fixed left-3 right-3 z-40 rounded-2xl border border-white/15 bg-ink/95 p-4 text-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl motion-safe:animate-[po-in_0.5s_var(--ease-out-expo)_both] sm:left-6 sm:right-auto sm:w-[360px] sm:p-5"
      style={{ bottom: "calc(var(--mobile-bar-h) + env(safe-area-inset-bottom) + 12px)" }}
    >
      <button type="button" onClick={close} aria-label="Close" className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" aria-hidden />
      </button>
      {state === "done" ? (
        <div className="flex gap-3 pr-8">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
          <div>
            <p className="font-semibold">Thank you — we&apos;ll be in touch.</p>
            <p className="mt-1 text-sm text-white/60">Our sales team replies within one working day with prices for your quantity.</p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setState("sending");
            const res = await fetch("/api/price-offer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: form.name, contact: form.contact, quantity: form.quantity || undefined, productSlug: product.slug, productName: product.name, sessionId: sessionId() }),
            }).catch(() => null);
            const body = res ? await res.json().catch(() => ({})) : {};
            if (res?.ok) {
              setState("done");
              write("po-done", "1", window.localStorage);
            } else {
              setState("idle");
              setErr((body as { error?: string }).error ?? "Couldn't send — please try again.");
            }
          }}
        >
          <p className="pr-8 text-[15px] font-semibold leading-snug">
            Want prices for {product.name ? <span className="text-accent">{product.name}</span> : "your order"}?
          </p>
          <p className="mt-1 text-[13px] text-white/60">Tell us how many — we reply on WhatsApp or email within one working day. No obligation.</p>
          <div className="mt-3 grid grid-cols-[1fr_88px] gap-2">
            <label className="sr-only" htmlFor="po-name">Your name</label>
            <input id="po-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" autoComplete="name" className="h-11 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-[15px] outline-none placeholder:text-white/35 focus:border-accent" />
            <label className="sr-only" htmlFor="po-qty">Quantity</label>
            <input id="po-qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value.replace(/\D/g, "") })} placeholder="Qty" inputMode="numeric" className="h-11 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-[15px] outline-none placeholder:text-white/35 focus:border-accent" />
          </div>
          <label className="sr-only" htmlFor="po-contact">Email or WhatsApp number</label>
          <input id="po-contact" required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="Email or WhatsApp (+country code)" autoComplete="email" className="mt-2 h-11 w-full rounded-xl border border-white/15 bg-white/[0.06] px-3 text-[15px] outline-none placeholder:text-white/35 focus:border-accent" />
          <button type="submit" disabled={state === "sending"} className={cn("mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-white hover:bg-accent-hover disabled:opacity-70")}>
            {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send me prices
          </button>
          {err && <p className="mt-2 text-sm text-red-300" role="alert">{err}</p>}
          <p className="mt-2 text-[11px] text-white/40">Used only to reply to you. Never shared.</p>
        </form>
      )}
    </aside>
  );
}
