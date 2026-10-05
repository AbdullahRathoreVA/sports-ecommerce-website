"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, MessageCircle, Sparkles, Wand2 } from "lucide-react";
import { Choice, Field, inputClass } from "./field";
import { COUNTRIES, TOP_COUNTRIES } from "@/lib/countries";
import { sessionId, track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

type ProductOption = { slug: string; name: string; category: string; moq: number };

type State = {
  productSlug: string;
  productName: string;
  quantity: string;
  colors: string;
  branding: string;
  sizes: string;
  material: string;
  targetDate: string;
  budget: string;
  message: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  country: string;
  preferredChannel: "email" | "whatsapp" | "phone";
};

export function QuoteForm({
  products,
  initialProduct,
  initialQty,
  whatsapp,
  responseTime,
  source = "QUOTE_FORM",
  design,
}: {
  products: ProductOption[];
  initialProduct?: string;
  initialQty?: number;
  whatsapp: string;
  responseTime: string;
  source?: "QUOTE_FORM" | "PRODUCT_PAGE" | "DESIGN_STUDIO";
  design?: Record<string, unknown>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [s, setS] = useState<State>({
    productSlug: products.some((p) => p.slug === initialProduct) ? initialProduct! : "",
    productName: products.some((p) => p.slug === initialProduct) ? "" : (initialProduct ?? ""),
    quantity: initialQty ? String(initialQty) : "",
    colors: "",
    branding: "",
    sizes: "",
    material: "",
    targetDate: "",
    budget: "",
    message: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    country: "",
    preferredChannel: "email",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [brief, setBrief] = useState("");
  const [briefState, setBriefState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [filled, setFilled] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [leadNumber, setLeadNumber] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const started = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof State>(key: K, value: State[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    if (!started.current) {
      started.current = true;
      track("quote_start", { label: source });
    }
  };

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  const selected = products.find((p) => p.slug === s.productSlug);

  async function fillFromBrief() {
    if (brief.trim().length < 8) return;
    setBriefState("busy");
    try {
      const res = await fetch("/api/brief", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: brief }) });
      if (!res.ok) throw new Error();
      const { brief: b } = (await res.json()) as { brief: Partial<Record<string, string | number>> };
      const changes: string[] = [];
      setS((prev) => {
        const next = { ...prev };
        const apply = (key: keyof State, value: unknown, label: string) => {
          if (value === undefined || value === null || value === "") return;
          (next as Record<string, unknown>)[key] = String(value);
          changes.push(label);
        };
        if (b.productSlug && products.some((p) => p.slug === b.productSlug)) apply("productSlug", b.productSlug, "product");
        apply("quantity", b.quantity, "quantity");
        apply("colors", b.colors, "colours");
        apply("branding", b.branding, "branding");
        apply("sizes", b.sizes, "sizes");
        apply("material", b.material, "material");
        apply("targetDate", b.targetDate, "deadline");
        apply("budget", b.budget, "budget");
        apply("company", b.company, "company");
        if (b.country && COUNTRIES.includes(String(b.country))) apply("country", b.country, "country");
        next.message = [prev.message, b.notes ? String(b.notes) : "", `Original brief: ${brief.trim()}`].filter(Boolean).join("\n").slice(0, 3800);
        return next;
      });
      setFilled(changes);
      setBriefState("done");
      track("ai_message", { label: "brief_parse" });
    } catch {
      setBriefState("error");
    }
  }

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!s.productSlug && !s.productName.trim()) e.product = "Choose a product or describe what you need";
    const q = Number(s.quantity);
    if (!s.quantity || !Number.isInteger(q) || q < 1) e.quantity = "Enter an approximate quantity";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    const e: Record<string, string> = {};
    if (s.name.trim().length < 2) e.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(s.email)) e.email = "Enter a valid email address";
    if (s.preferredChannel !== "email" && !s.phone.trim()) e.phone = "Add a number so we can reach you there";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: s.productSlug && source === "QUOTE_FORM" && initialProduct ? "PRODUCT_PAGE" : source,
          name: s.name,
          email: s.email,
          phone: s.phone || undefined,
          company: s.company || undefined,
          country: s.country || undefined,
          preferredChannel: s.preferredChannel,
          productSlug: s.productSlug || undefined,
          productName: s.productSlug ? undefined : s.productName || undefined,
          quantity: Number(s.quantity) || undefined,
          requirements: { colors: s.colors, branding: s.branding, sizes: s.sizes, material: s.material },
          targetDate: s.targetDate || undefined,
          budget: s.budget || undefined,
          message: s.message || undefined,
          design,
          sessionId: sessionId(),
          website: (document.getElementById("qf-website") as HTMLInputElement | null)?.value,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        throw new Error(data.error ?? "Something went wrong.");
      }
      setLeadNumber(data.leadNumber);
      setStep(3);
      if (source === "DESIGN_STUDIO") track("customizer_complete", { label: data.leadNumber });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 3 && leadNumber) {
    const wa = whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I just sent quote request ${leadNumber}.`)}` : null;
    return (
      <div ref={topRef} className="scroll-mt-24 rounded-[var(--radius-card)] border hairline bg-surface p-6 sm:p-10">
        <CheckCircle2 className="h-10 w-10 text-signal" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Request received</h2>
        <p className="mt-2 text-muted">
          Your reference is <strong className="font-mono text-fg">{leadNumber}</strong>. {responseTime}
        </p>
        <ol className="mt-6 space-y-3 text-[15px] text-muted">
          <li>1. We review your requirements and prepare pricing.</li>
          <li>2. We send a quote and, where helpful, a digital mock-up.</li>
          <li>3. You approve a sample, then we schedule production.</li>
        </ol>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {wa && (
            <a href={wa} className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1fae4b] px-5 font-semibold text-white" data-track="whatsapp_click" data-track-label="Quote success">
              <MessageCircle className="h-5 w-5" aria-hidden /> Continue on WhatsApp
            </a>
          )}
          <Link href="/products" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] border hairline px-5 font-semibold">
            Keep browsing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <ol className="mb-6 grid grid-cols-2 gap-2" aria-label="Progress">
        {["Your requirements", "Your details"].map((label, i) => (
          <li key={label} className={cn("rounded-full px-4 py-2 text-center text-sm font-semibold", step === i + 1 ? "bg-white text-ink" : step > i + 1 ? "bg-accent/10 text-accent" : "bg-surface-2 text-subtle")} aria-current={step === i + 1 ? "step" : undefined}>
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <div className="space-y-6">
          <div className="on-dark rounded-[var(--radius-card)] bg-ink p-5 text-white sm:p-6">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Short on time? Paste your brief
            </p>
            <p className="mt-1 text-sm text-white/60">An email, a WhatsApp message, a list — our assistant fills in the form for you to check.</p>
            <label htmlFor="brief" className="sr-only">
              Your brief
            </label>
            <textarea
              id="brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="e.g. Need 120 football kits for our youth club, navy & gold, crest on chest + sponsor, names and numbers on back, sizes YS–XL, needed before March, delivery to Leeds UK"
              className="mt-3 w-full rounded-xl border border-white/15 bg-white/[0.06] p-3.5 text-[16px] text-white outline-none placeholder:text-white/35 focus:border-cobalt-300"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={fillFromBrief}
                disabled={briefState === "busy" || brief.trim().length < 8}
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold disabled:opacity-50"
              >
                {briefState === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wand2 className="h-4 w-4" aria-hidden />}
                Fill the form for me
              </button>
              {briefState === "done" && (
                <p className="text-sm text-white/75" role="status">
                  {filled.length ? `Filled: ${filled.join(", ")}. Please check below.` : "Nothing specific found — add details below."}
                </p>
              )}
              {briefState === "error" && <p className="text-sm text-red-300">Couldn&apos;t read that — please fill the fields below.</p>}
            </div>
          </div>

          <Field label="Product" htmlFor="product" error={errors.product}>
            <select
              id="product"
              value={s.productSlug}
              onChange={(e) => set("productSlug", e.target.value)}
              className={inputClass}
              aria-invalid={!!errors.product}
            >
              <option value="">Something else / not sure</option>
              {[...new Set(products.map((p) => p.category))].map((cat) => (
                <optgroup key={cat} label={cat}>
                  {products
                    .filter((p) => p.category === cat)
                    .map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Field>
          {!s.productSlug && (
            <Field label="What do you need?" htmlFor="productName" hint="Describe the product — we make to specification.">
              <input id="productName" value={s.productName} maxLength={120} onChange={(e) => set("productName", e.target.value)} className={inputClass} placeholder="e.g. Rugby jerseys, cycling kit, leather gloves…" />
            </Field>
          )}

          <Field
            label="Quantity"
            htmlFor="quantity"
            error={errors.quantity}
            hint={selected ? `Bulk orders for this product start at ${selected.moq} units — samples are possible below that.` : "An estimate is fine."}
          >
            <input id="quantity" type="number" inputMode="numeric" min={1} max={1000000} value={s.quantity} onChange={(e) => set("quantity", e.target.value)} className={inputClass} aria-invalid={!!errors.quantity} />
          </Field>

          <fieldset className="space-y-4 rounded-[var(--radius-card)] border hairline bg-chalk/60 p-4 sm:p-5">
            <legend className="px-1 text-sm font-semibold">Details that make the quote accurate</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Colours" htmlFor="colors" optional>
                <input id="colors" value={s.colors} maxLength={200} onChange={(e) => set("colors", e.target.value)} className={inputClass} placeholder="Navy & gold" />
              </Field>
              <Field label="Sizes" htmlFor="sizes" optional>
                <input id="sizes" value={s.sizes} maxLength={300} onChange={(e) => set("sizes", e.target.value)} className={inputClass} placeholder="YS–XL, mixed" />
              </Field>
              <Field label="Branding" htmlFor="branding" optional className="sm:col-span-2">
                <input id="branding" value={s.branding} maxLength={300} onChange={(e) => set("branding", e.target.value)} className={inputClass} placeholder="Crest on chest, sponsor, names & numbers on back" />
              </Field>
              <Field label="Needed by" htmlFor="targetDate" optional>
                <input id="targetDate" value={s.targetDate} maxLength={80} onChange={(e) => set("targetDate", e.target.value)} className={inputClass} placeholder="Before season start" />
              </Field>
              <Field label="Target budget" htmlFor="budget" optional>
                <input id="budget" value={s.budget} maxLength={80} onChange={(e) => set("budget", e.target.value)} className={inputClass} placeholder="$15 per kit" />
              </Field>
            </div>
            <Field label="Anything else?" htmlFor="message" optional>
              <textarea id="message" rows={4} value={s.message} maxLength={3800} onChange={(e) => set("message", e.target.value)} className={cn(inputClass, "h-auto py-3")} />
            </Field>
          </fieldset>

          <button
            type="button"
            onClick={() => validateStep1() && setStep(2)}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-white text-[15px] font-semibold text-ink sm:w-auto sm:px-8"
            style={{ height: 52 }}
          >
            Continue <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {step === 2 && (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" htmlFor="name" error={errors.name}>
              <input id="name" autoComplete="name" value={s.name} maxLength={80} onChange={(e) => set("name", e.target.value)} className={inputClass} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Email" htmlFor="email" error={errors.email}>
              <input id="email" type="email" autoComplete="email" inputMode="email" value={s.email} maxLength={120} onChange={(e) => set("email", e.target.value)} className={inputClass} aria-invalid={!!errors.email} />
            </Field>
            <Field label="WhatsApp / phone" htmlFor="phone" error={errors.phone} optional={s.preferredChannel === "email"}>
              <input id="phone" type="tel" autoComplete="tel" inputMode="tel" value={s.phone} maxLength={30} onChange={(e) => set("phone", e.target.value)} className={inputClass} placeholder="+44 7700 900123" aria-invalid={!!errors.phone} />
            </Field>
            <Field label="Team / company" htmlFor="company" optional>
              <input id="company" autoComplete="organization" value={s.company} maxLength={120} onChange={(e) => set("company", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Delivery country" htmlFor="country" optional className="sm:col-span-2">
              <select id="country" autoComplete="country-name" value={s.country} onChange={(e) => set("country", e.target.value)} className={inputClass}>
                <option value="">Select…</option>
                <optgroup label="Most common">
                  {TOP_COUNTRIES.map((c) => (
                    <option key={`top-${c}`} value={c}>
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
          <fieldset>
            <legend className="mb-2 text-sm font-medium">How should we reply?</legend>
            <div className="grid grid-cols-3 gap-2">
              <Choice name="channel" value="email" checked={s.preferredChannel === "email"} onChange={(v) => set("preferredChannel", v as State["preferredChannel"])}>
                Email
              </Choice>
              <Choice name="channel" value="whatsapp" checked={s.preferredChannel === "whatsapp"} onChange={(v) => set("preferredChannel", v as State["preferredChannel"])}>
                WhatsApp
              </Choice>
              <Choice name="channel" value="phone" checked={s.preferredChannel === "phone"} onChange={(v) => set("preferredChannel", v as State["preferredChannel"])}>
                Call
              </Choice>
            </div>
          </fieldset>
          <input id="qf-website" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          {serverError && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
              {serverError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" onClick={() => setStep(1)} className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border hairline px-5 font-semibold">
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </button>
            <button type="submit" disabled={submitting} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-8 font-semibold text-accent-ink disabled:opacity-70 sm:flex-none">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send request
            </button>
          </div>
          <p className="text-xs text-subtle">
            We use your details only to reply to this request. See our <Link href="/privacy" className="underline">privacy notice</Link>.
          </p>
        </form>
      )}
    </div>
  );
}
