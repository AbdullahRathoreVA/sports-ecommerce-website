"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Field, inputClass } from "./field";
import { COUNTRIES, TOP_COUNTRIES } from "@/lib/countries";
import { sessionId } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const TOPICS = ["A quote for an order", "Samples", "Private label / OEM", "An existing order", "Something else"];

export function ContactForm({ productSlug }: { productSlug?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "").trim();
    const e: Record<string, string> = {};
    if (get("name").length < 2) e.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) e.email = "Enter a valid email address";
    if (get("message").length < 10) e.message = "Tell us a little more (at least 10 characters)";
    setErrors(e);
    if (Object.keys(e).length) return;
    setState("sending");
    setServerError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "CONTACT_FORM",
          name: get("name"),
          email: get("email"),
          phone: get("phone") || undefined,
          company: get("company") || undefined,
          country: get("country") || undefined,
          productSlug,
          message: `[${get("topic")}] ${get("message")}`,
          preferredChannel: get("phone") ? "whatsapp" : "email",
          sessionId: sessionId(),
          website: get("website"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        throw new Error(data.error ?? "Something went wrong.");
      }
      setRef(data.leadNumber);
      setState("done");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-[var(--radius-card)] border hairline bg-surface p-8">
        <CheckCircle2 className="h-9 w-9 text-signal" aria-hidden />
        <p className="mt-3 text-xl font-semibold">Message sent</p>
        <p className="mt-1 text-muted">
          Thanks — your reference is <span className="font-mono font-semibold text-fg">{ref}</span>. We&apos;ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" error={errors.name}>
          <input id="c-name" name="name" autoComplete="name" maxLength={80} className={inputClass} aria-invalid={!!errors.name} />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors.email}>
          <input id="c-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={120} className={inputClass} aria-invalid={!!errors.email} />
        </Field>
        <Field label="WhatsApp / phone" htmlFor="c-phone" optional error={errors.phone}>
          <input id="c-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} className={inputClass} />
        </Field>
        <Field label="Company / team" htmlFor="c-company" optional>
          <input id="c-company" name="company" autoComplete="organization" maxLength={120} className={inputClass} />
        </Field>
        <Field label="Country" htmlFor="c-country" optional>
          <select id="c-country" name="country" defaultValue="" className={inputClass}>
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
        <Field label="Topic" htmlFor="c-topic">
          <select id="c-topic" name="topic" className={inputClass}>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Message" htmlFor="c-message" error={errors.message}>
        <textarea id="c-message" name="message" rows={5} maxLength={3800} className={cn(inputClass, "h-auto py-3")} aria-invalid={!!errors.message} />
      </Field>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {serverError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200" role="alert">
          {serverError}
        </p>
      )}
      <button type="submit" disabled={state === "sending"} className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-ink font-semibold text-white disabled:opacity-70 sm:w-auto sm:px-8">
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send message
      </button>
    </form>
  );
}
