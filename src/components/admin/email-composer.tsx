"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Writes to the customer from the company address. Every message is stored
 * against the order or lead, so quotes, approvals and shipping notes form one
 * dated written record — the evidence that holds up in a payment dispute.
 */
export function EmailComposer({ to, defaultSubject, send, templates = [] }: { to: string; defaultSubject: string; send: (subject: string, body: string) => Promise<Result>; templates?: { label: string; body: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => setOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-white text-sm font-semibold text-ink">
          <Mail className="h-4 w-4" aria-hidden /> Write an email
        </button>
        {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">{msg.text}</p>}
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await send(subject, body);
          setMsg(r.ok ? { ok: true, text: r.message ?? "Sent." } : { ok: false, text: r.error });
          if (r.ok) {
            setBody("");
            setOpen(false);
            router.refresh();
          }
        });
      }}
    >
      <p className="text-xs text-subtle">To {to} · saved to the record</p>
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {templates.map((t) => (
            <button key={t.label} type="button" onClick={() => setBody(t.body)} className="h-8 rounded-full border hairline px-3 text-xs font-medium text-muted hover:text-fg">
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div>
        <label htmlFor="em-subject" className="mb-1.5 block text-sm font-medium">Subject</label>
        <input id="em-subject" value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} className={inputClass} required />
      </div>
      <div>
        <label htmlFor="em-body" className="mb-1.5 block text-sm font-medium">Message</label>
        <textarea id="em-body" rows={7} value={body} maxLength={10000} onChange={(e) => setBody(e.target.value)} className={cn(inputClass, "h-auto py-2.5")} required />
        <p className="mt-1 text-xs text-subtle">The greeting, your name, the company name and the reference number are added automatically.</p>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-sm font-semibold text-accent-ink disabled:opacity-70">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send email
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-[var(--radius-control)] border hairline px-4 text-sm font-medium text-muted">Cancel</button>
      </div>
      {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">{msg.text}</p>}
    </form>
  );
}
