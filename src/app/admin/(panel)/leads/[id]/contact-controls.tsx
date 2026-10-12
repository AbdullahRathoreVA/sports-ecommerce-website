"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { deleteLead, updateLeadContact } from "../manage";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

type Contact = { name: string; email: string; phone: string; company: string; country: string; city: string; website: string };

const FIELDS: { key: keyof Contact; label: string; type?: string; placeholder?: string }[] = [
  { key: "name", label: "Name" },
  { key: "company", label: "Company / club / school" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone / WhatsApp", type: "tel", placeholder: "+44 …" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "website", label: "Website", type: "url", placeholder: "https://" },
];

/** Inline editor for a lead's contact details. */
export function LeadContactEditor({ leadId, initial }: { leadId: string; initial: Contact }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
        <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit contact details
      </button>
    );
  return (
    <form
      className="mt-4 space-y-3 border-t hairline pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await updateLeadContact(leadId, v);
          setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
          if (r.ok) {
            setOpen(false);
            router.refresh();
          }
        });
      }}
    >
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label htmlFor={`lc-${f.key}`} className="mb-1 block text-xs font-medium text-muted">{f.label}</label>
          <input id={`lc-${f.key}`} type={f.type ?? "text"} value={v[f.key]} placeholder={f.placeholder} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className={inputClass} />
        </div>
      ))}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-sm font-semibold text-accent-ink disabled:opacity-70">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-[var(--radius-control)] border hairline px-4 text-sm font-semibold">Cancel</button>
      </div>
      {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">{msg.text}</p>}
    </form>
  );
}

/** Two-step delete so a mis-tap never removes a real enquiry. */
export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!armed) return setArmed(true);
          start(async () => {
            const r = await deleteLead(leadId);
            if (r.ok) router.push("/admin/leads");
            else setErr(r.error);
          });
        }}
        className={cn("inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm font-semibold", armed ? "border-red-400/60 bg-red-500/10 text-red-200" : "hairline text-muted hover:text-fg")}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
        {armed ? "Tap again to delete for good" : "Delete lead"}
      </button>
      {armed && !pending && (
        <button type="button" onClick={() => setArmed(false)} className="ml-2 text-xs text-subtle hover:text-fg">
          Keep it
        </button>
      )}
      {err && <p className="mt-2 text-sm text-red-300">{err}</p>}
    </div>
  );
}
