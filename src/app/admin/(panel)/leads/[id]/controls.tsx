"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { addLeadNote, createOrderFromLead, updateLead } from "../actions";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "NEGOTIATING", "WON", "LOST"] as const;
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function LeadControls({ leadId, status, assignedToId, team }: { leadId: string; status: string; assignedToId: string | null; team: { id: string; name: string }[] }) {
  const router = useRouter();
  const [s, setS] = useState({ status, assignedToId });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await updateLead(leadId, { status: s.status as (typeof STAGES)[number], assignedToId: s.assignedToId });
          setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Stage</legend>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((st) => (
            <button key={st} type="button" aria-pressed={s.status === st} onClick={() => setS({ ...s, status: st })} className={cn("h-9 rounded-full border px-3 text-sm font-medium", s.status === st ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
              {label(st)}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="lc-owner" className="mb-1.5 block text-sm font-medium">Owner</label>
        <select id="lc-owner" value={s.assignedToId ?? ""} onChange={(e) => setS({ ...s, assignedToId: e.target.value || null })} className={inputClass}>
          <option value="">Unassigned</option>
          {team.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent font-semibold text-accent-ink disabled:opacity-70">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
      </button>
      {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">{msg.text}</p>}
    </form>
  );
}

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addLeadNote(leadId, note);
          if (r.ok) {
            setNote("");
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor="lnote" className="sr-only">Add a note</label>
      <input id="lnote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} placeholder="Call summary, price discussed, next step…" className={inputClass} />
      <button disabled={pending || !note.trim()} className="h-12 shrink-0 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50">Add</button>
    </form>
  );
}

/** Turn an agreed quote into a tracked order (price is what was agreed with the customer). */
export function CreateOrderForm({
  leadId,
  defaults,
  paymentMethods,
}: {
  leadId: string;
  defaults: { productName: string; quantity: number | null; country: string | null };
  paymentMethods: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full rounded-[var(--radius-control)] bg-accent text-sm font-semibold text-white hover:bg-accent-hover">
        Customer agreed? Create the order
      </button>
    );
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setMsg(null);
        start(async () => {
          const r = await createOrderFromLead(leadId, Object.fromEntries(fd) as never);
          setMsg(r.ok ? { ok: true, text: r.message ?? "Order created." } : { ok: false, text: r.error });
          if (r.ok && r.orderId) router.push(`/admin/orders/${r.orderId}`);
        });
      }}
    >
      <label className="block text-sm">
        <span className="text-subtle">Product</span>
        <input name="productName" required defaultValue={defaults.productName} className={cn(inputClass, "mt-1")} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="text-subtle">Quantity</span>
          <input name="quantity" type="number" min={1} required defaultValue={defaults.quantity ?? undefined} className={cn(inputClass, "mt-1")} />
        </label>
        <label className="block text-sm">
          <span className="text-subtle">Agreed price / piece (USD)</span>
          <input name="unitPrice" type="number" min={0} step="0.01" required className={cn(inputClass, "mt-1")} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-subtle">Payment</span>
        <select name="paymentMethod" className={cn(inputClass, "mt-1")}>
          {paymentMethods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-subtle">Ship to (address)</span>
        <input name="shipLine1" required className={cn(inputClass, "mt-1")} />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-1 block text-sm">
          <span className="text-subtle">City</span>
          <input name="shipCity" required className={cn(inputClass, "mt-1")} />
        </label>
        <label className="block text-sm">
          <span className="text-subtle">Postcode</span>
          <input name="shipPostal" className={cn(inputClass, "mt-1")} />
        </label>
        <label className="block text-sm">
          <span className="text-subtle">Country</span>
          <input name="shipCountry" required defaultValue={defaults.country ?? undefined} className={cn(inputClass, "mt-1")} />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-subtle">Note for the customer (optional)</span>
        <textarea name="note" rows={2} className={cn(inputClass, "mt-1 h-auto py-2")} />
      </label>
      <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-sm font-semibold text-white disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Create order &amp; tracking link
      </button>
      {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-400" : "text-red-400")}>{msg.text}</p>}
      <p className="text-xs text-subtle">The order starts as Confirmed. Update its status from the order page as production moves on — the customer sees every step.</p>
    </form>
  );
}
