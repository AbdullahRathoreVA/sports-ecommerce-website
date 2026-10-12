"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createManualLead } from "../manage";
import { MANUAL_ORIGINS } from "@/lib/admin/lead-sources";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

type Origin = (typeof MANUAL_ORIGINS)[number];

export function ManualLeadForm({ products }: { products: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Origin>("WhatsApp");
  const [channel, setChannel] = useState<"whatsapp" | "phone" | "email">("whatsapp");
  const [c, setC] = useState({ name: "", company: "", email: "", phone: "", country: "", city: "", website: "" });
  const [req, setReq] = useState({ productName: "", quantity: "", message: "" });

  const field = (key: keyof typeof c, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`ml-${key}`} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input id={`ml-${key}`} value={c[key]} onChange={(e) => setC({ ...c, [key]: e.target.value })} className={inputClass} {...props} />
    </div>
  );

  return (
    <form
      className="grid max-w-4xl gap-6 lg:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const r = await createManualLead({
            contact: c,
            origin,
            preferredChannel: channel,
            productName: req.productName,
            quantity: req.quantity ? Number(req.quantity) : null,
            message: req.message,
          });
          if (r.ok && r.id) router.push(`/admin/leads/${r.id}`);
          else if (!r.ok) setErr(r.error);
        });
      }}
    >
      <section className="space-y-4 rounded-[var(--radius-card)] border hairline bg-surface p-5">
        <h2 className="text-sm font-semibold">Who is it?</h2>
        {field("name", "Name (person or business)", { required: true, placeholder: "e.g. Coach Ahmed / Riverside FC" })}
        {field("company", "Club, school or company")}
        {field("phone", "Phone / WhatsApp", { type: "tel", placeholder: "+44 7…" })}
        {field("email", "Email", { type: "email" })}
        <div className="grid grid-cols-2 gap-3">
          {field("country", "Country")}
          {field("city", "City")}
        </div>
        {field("website", "Website or Instagram link", { type: "url", placeholder: "https://" })}
        <p className="text-xs text-subtle">At least one of phone, email or website is needed so the team can reach them.</p>
      </section>

      <section className="space-y-4 rounded-[var(--radius-card)] border hairline bg-surface p-5">
        <h2 className="text-sm font-semibold">How did they reach you?</h2>
        <div className="flex flex-wrap gap-1.5">
          {MANUAL_ORIGINS.map((o) => (
            <button key={o} type="button" aria-pressed={origin === o} onClick={() => setOrigin(o)} className={cn("h-9 rounded-full border px-3 text-sm font-medium", origin === o ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
              {o}
            </button>
          ))}
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Best way to reply</p>
          <div className="flex gap-1.5">
            {(["whatsapp", "phone", "email"] as const).map((ch) => (
              <button key={ch} type="button" aria-pressed={channel === ch} onClick={() => setChannel(ch)} className={cn("h-9 rounded-full border px-3 text-sm font-medium capitalize", channel === ch ? "border-accent bg-accent/15 text-fg" : "hairline text-muted hover:text-fg")}>
                {ch === "whatsapp" ? "WhatsApp" : ch}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="ml-product" className="mb-1.5 block text-sm font-medium">What do they want?</label>
          <input id="ml-product" list="ml-products" value={req.productName} onChange={(e) => setReq({ ...req, productName: e.target.value })} placeholder="Product or category" className={inputClass} />
          <datalist id="ml-products">
            {products.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor="ml-qty" className="mb-1.5 block text-sm font-medium">Quantity</label>
          <input id="ml-qty" type="number" min={1} inputMode="numeric" value={req.quantity} onChange={(e) => setReq({ ...req, quantity: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label htmlFor="ml-msg" className="mb-1.5 block text-sm font-medium">Notes</label>
          <textarea id="ml-msg" rows={5} value={req.message} onChange={(e) => setReq({ ...req, message: e.target.value })} placeholder="What they said, colours, deadline, price discussed…" className={cn(inputClass, "h-auto py-3")} />
        </div>
      </section>

      <div className="lg:col-span-2">
        <button type="submit" disabled={pending} className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 font-semibold text-accent-ink disabled:opacity-70">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save lead
        </button>
        {err && <p className="mt-3 text-sm text-red-300" role="alert">{err}</p>}
      </div>
    </form>
  );
}
