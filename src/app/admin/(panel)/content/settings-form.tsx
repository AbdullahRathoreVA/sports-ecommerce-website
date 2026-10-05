"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import type { SiteSettings } from "@/config/site";
import { saveSettings } from "./actions";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const area = cn(inputClass, "h-auto py-2.5 leading-relaxed");

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border hairline bg-surface p-4 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Text({ id, label, value, onChange, hint, wide, placeholder, type = "text", multiline, max = 500 }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; wide?: boolean; placeholder?: string; type?: string; multiline?: boolean; max?: number }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-subtle">{hint}</span>}
      </label>
      {multiline ? (
        <textarea id={id} rows={3} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={area} />
      ) : (
        <input id={id} type={type} value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const up = <G extends "brand" | "contact" | "social" | "facts" | "commerce">(g: G, patch: Partial<SiteSettings[G]>) => setS((p) => ({ ...p, [g]: { ...p[g], ...patch } }));

  return (
    <form
      className="space-y-6 pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await saveSettings(s);
          setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <Group title="Brand" hint="The working name is a placeholder until the factory confirms its trading name.">
        <Text id="b-name" label="Brand name" value={s.brand.name} max={60} onChange={(v) => up("brand", { name: v })} />
        <Text id="b-short" label="Short name" value={s.brand.shortName} max={30} onChange={(v) => up("brand", { shortName: v })} />
        <Text id="b-tag" label="Tagline" value={s.brand.tagline} max={120} onChange={(v) => up("brand", { tagline: v })} wide />
        <Text id="b-desc" label="Description" value={s.brand.description} max={400} onChange={(v) => up("brand", { description: v })} wide multiline hint="Used in search results and the footer" />
        <Text id="b-house" label="House label" value={s.brand.houseLabel} onChange={(v) => up("brand", { houseLabel: v })} hint="The factory's own label, if it has one" />
      </Group>

      <Group title="Contact" hint="Shown across the site. Empty fields are hidden — nothing is invented.">
        <Text id="c-email" type="email" label="Business email" value={s.contact.email} onChange={(v) => up("contact", { email: v.trim() })} placeholder="sales@yourdomain.com" hint="Customers are asked to reply here" />
        <Text id="c-phone" label="Phone" value={s.contact.phone} onChange={(v) => up("contact", { phone: v })} placeholder="+92 …" />
        <Text id="c-wa" label="WhatsApp number" value={s.contact.whatsapp} onChange={(v) => up("contact", { whatsapp: v.replace(/\D/g, "") })} placeholder="923001234567" hint="Digits only, with country code" />
        <Text id="c-hours" label="Office hours" value={s.contact.hours} onChange={(v) => up("contact", { hours: v })} placeholder="Mon–Sat, 9:00–18:00 PKT" />
        <Text id="c-addr" label="Street address" value={s.contact.addressLine} onChange={(v) => up("contact", { addressLine: v })} wide />
        <Text id="c-city" label="City" value={s.contact.city} onChange={(v) => up("contact", { city: v })} />
        <Text id="c-country" label="Country" value={s.contact.country} onChange={(v) => up("contact", { country: v })} />
        <Text id="c-maps" type="url" label="Google Maps link" value={s.contact.mapsUrl} onChange={(v) => up("contact", { mapsUrl: v.trim() })} placeholder="https://maps.app.goo.gl/…" />
        <Text id="c-resp" label="Response promise" value={s.contact.responseTime} onChange={(v) => up("contact", { responseTime: v })} hint="Only promise what the team can keep" />
      </Group>

      <Group title="Social profiles" hint="Full https:// links. Empty ones are hidden.">
        {(["instagram", "facebook", "linkedin", "tiktok", "youtube"] as const).map((k) => (
          <Text key={k} id={`s-${k}`} type="url" label={k.charAt(0).toUpperCase() + k.slice(1)} value={s.social[k]} onChange={(v) => up("social", { [k]: v.trim() })} />
        ))}
      </Group>

      <Group title="Orders & payment" hint="Shown at checkout and in order emails.">
        <div>
          <label htmlFor="m-cur" className="mb-1.5 block text-sm font-medium">Currency</label>
          <select id="m-cur" value={s.commerce.currency} onChange={(e) => up("commerce", { currency: e.target.value })} className={inputClass}>
            {["USD", "EUR", "GBP", "CAD", "AUD"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium">Payment methods</p>
          <div className="space-y-2">
            {s.commerce.paymentMethods.map((m, i) => (
              <div key={i} className="grid gap-2 rounded-xl border hairline p-3 sm:grid-cols-[1fr_2fr_auto]">
                <label className="sr-only" htmlFor={`pm-l-${i}`}>Label</label>
                <input id={`pm-l-${i}`} value={m.label} maxLength={80} onChange={(e) => up("commerce", { paymentMethods: s.commerce.paymentMethods.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Bank transfer" className={cn(inputClass, "h-11")} />
                <label className="sr-only" htmlFor={`pm-d-${i}`}>Detail</label>
                <input id={`pm-d-${i}`} value={m.detail} maxLength={240} onChange={(e) => up("commerce", { paymentMethods: s.commerce.paymentMethods.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) })} placeholder="What happens next" className={cn(inputClass, "h-11")} />
                <button type="button" disabled={s.commerce.paymentMethods.length <= 1} onClick={() => up("commerce", { paymentMethods: s.commerce.paymentMethods.filter((_, j) => j !== i) })} aria-label="Remove payment method" className="grid h-11 w-11 place-items-center rounded-lg text-subtle hover:text-red-300 disabled:opacity-30">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
          {s.commerce.paymentMethods.length < 6 && (
            <button type="button" onClick={() => up("commerce", { paymentMethods: [...s.commerce.paymentMethods, { id: `method_${Date.now().toString(36)}`, label: "", detail: "" }] })} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-medium text-muted hover:text-fg">
              <Plus className="h-4 w-4" aria-hidden /> Add method
            </button>
          )}
        </div>
        <Text id="m-ship" label="Shipping note" value={s.commerce.shippingNote} max={400} onChange={(v) => up("commerce", { shippingNote: v })} multiline wide />
        <Text id="m-sample" label="Sample note" value={s.commerce.sampleNote} max={400} onChange={(v) => up("commerce", { sampleNote: v })} multiline wide />
      </Group>

      <Group title="Company facts" hint="Shown on the homepage and About page only when filled. Use figures the factory can prove — buyers check.">
        <Text id="f-founded" label="Founded" value={s.facts.founded} onChange={(v) => up("facts", { founded: v })} placeholder="e.g. 2009" />
        <Text id="f-team" label="Team size" value={s.facts.teamSize} onChange={(v) => up("facts", { teamSize: v })} placeholder="e.g. 120 staff" />
        <Text id="f-cap" label="Monthly capacity" value={s.facts.monthlyCapacity} onChange={(v) => up("facts", { monthlyCapacity: v })} placeholder="e.g. 25,000 pieces" />
        <Text id="f-mkts" label="Export markets" value={s.facts.exportMarkets} onChange={(v) => up("facts", { exportMarkets: v })} placeholder="e.g. USA, UK, EU, Canada" />
      </Group>

      <section className="rounded-[var(--radius-card)] border hairline bg-surface p-4 sm:p-6">
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={s.demoMode} onChange={(e) => setS({ ...s, demoMode: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
          <span>
            <span className="block font-semibold">Preview mode</span>
            <span className="mt-0.5 block text-sm text-muted">Shows the small &ldquo;Preview&rdquo; label on the public site. Turn off at launch, once the brand name, contact details and real products are in.</span>
          </span>
        </label>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t hairline bg-ink-2/95 px-4 py-3 backdrop-blur lg:left-[248px]">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3">
          {msg && (
            <p className={cn("mr-auto line-clamp-2 text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">
              {msg.text}
            </p>
          )}
          <button type="submit" disabled={pending} className="flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 font-semibold text-accent-ink disabled:opacity-70">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save settings
          </button>
        </div>
      </div>
    </form>
  );
}
