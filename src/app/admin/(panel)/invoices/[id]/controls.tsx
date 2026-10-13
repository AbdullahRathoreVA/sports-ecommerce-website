"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { addPayment, removePayment, saveInvoice, sendInvoice, voidInvoice } from "../actions";
import { inputClass } from "@/components/forms/field";
import { computeTotals, parseMoney } from "@/lib/invoice-math";
import { formatMoney, cn } from "@/lib/utils";

type Line = { description: string; details: string; quantity: string; unit: string };
export type EditorInitial = {
  poNumber: string;
  issueDate: string;
  dueDate: string;
  billName: string;
  billCompany: string;
  billEmail: string;
  billPhone: string;
  billAddress: string;
  shipVia: string;
  deliveryTime: string;
  items: Line[];
  shipping: string;
  discount: string;
  taxPercent: string;
  paymentTerms: string;
  notes: string;
};

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? "Done." } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  const note = msg && <p className={cn("text-sm", msg.ok ? "text-emerald-400" : "text-red-400")}>{msg.text}</p>;
  return { pending, run, note };
}

const label = "mb-1 block text-xs font-semibold text-muted";
const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-60";

export function InvoiceEditor({ id, currency, initial, locked }: { id: string; currency: string; initial: EditorInitial; locked: boolean }) {
  const [v, setV] = useState(initial);
  const { pending, run, note } = useAction();
  const set = (k: keyof EditorInitial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  const setLine = (i: number, k: keyof Line, val: string) => setV({ ...v, items: v.items.map((l, j) => (j === i ? { ...l, [k]: val } : l)) });
  const cents = (s: string) => parseMoney(s || "0") ?? 0;
  const t = computeTotals(
    v.items.map((l) => ({ quantity: Number(l.quantity) || 0, unitCents: cents(l.unit) })),
    { shippingCents: cents(v.shipping), discountCents: cents(v.discount), taxBasisPoints: Math.round((Number(v.taxPercent) || 0) * 100) },
  );
  const field = (k: keyof EditorInitial, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className={label}>{text}</span>
      <input className={inputClass} value={v[k] as string} onChange={set(k)} disabled={locked} {...props} />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveInvoice(id, { ...v, items: v.items.map((l) => ({ description: l.description, details: l.details, quantity: Number(l.quantity), unit: l.unit })) }));
      }}
      className="space-y-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {field("billName", "Client name")}
        {field("billCompany", "Company / club")}
        {field("billEmail", "Email", { type: "email" })}
        {field("billPhone", "Phone")}
      </div>
      <label className="block">
        <span className={label}>Billing address</span>
        <textarea className={cn(inputClass, "h-20 py-2")} value={v.billAddress} onChange={set("billAddress")} disabled={locked} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        {field("issueDate", "Invoice date", { type: "date" })}
        {field("dueDate", "Due date", { type: "date" })}
        {field("poNumber", "Client PO no. (optional)")}
        {field("shipVia", "Shipping via (e.g. DHL Express / Air)")}
        {field("deliveryTime", "Delivery time (e.g. 8–12 days)")}
      </div>

      <div>
        <p className={label}>Items — your custom prices ({currency})</p>
        <div className="space-y-2">
          {v.items.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-lg bg-white/[0.03] p-2 sm:grid-cols-[1.4fr_1fr_80px_110px_auto]">
              <input className={inputClass} placeholder="Description" value={l.description} onChange={(e) => setLine(i, "description", e.target.value)} disabled={locked} />
              <input className={inputClass} placeholder="Details (fabric, sizes…)" value={l.details} onChange={(e) => setLine(i, "details", e.target.value)} disabled={locked} />
              <input className={inputClass} placeholder="Qty" inputMode="numeric" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} disabled={locked} />
              <input className={inputClass} placeholder="Unit price" inputMode="decimal" value={l.unit} onChange={(e) => setLine(i, "unit", e.target.value)} disabled={locked} />
              <button type="button" aria-label="Remove line" className="grid h-10 w-10 place-items-center rounded-lg text-subtle hover:text-red-400 disabled:opacity-40" disabled={locked || v.items.length === 1} onClick={() => setV({ ...v, items: v.items.filter((_, j) => j !== i) })}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {!locked && (
          <button type="button" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent" onClick={() => setV({ ...v, items: [...v.items, { description: "", details: "", quantity: "1", unit: "" }] })}>
            <Plus className="h-4 w-4" /> Add line
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {field("shipping", "Shipping / freight", { inputMode: "decimal" })}
        {field("discount", "Discount", { inputMode: "decimal" })}
        {field("taxPercent", "Tax %", { inputMode: "decimal" })}
      </div>
      <p className="rounded-lg bg-white/[0.04] p-3 text-sm">
        Subtotal {formatMoney(t.subtotalCents, currency)} · Total <strong className="text-base">{formatMoney(t.totalCents, currency)}</strong>
      </p>
      <label className="block">
        <span className={label}>Payment terms</span>
        <textarea className={cn(inputClass, "h-16 py-2")} value={v.paymentTerms} onChange={set("paymentTerms")} disabled={locked} />
      </label>
      <label className="block">
        <span className={label}>Notes (one per line)</span>
        <textarea className={cn(inputClass, "h-20 py-2")} value={v.notes} onChange={set("notes")} disabled={locked} />
      </label>
      {!locked && (
        <div className="flex items-center gap-3">
          <button className={cn(btn, "bg-accent text-white")} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save invoice
          </button>
          {note}
        </div>
      )}
    </form>
  );
}

export function SendInvoice({ id, to, sent }: { id: string; to: string; sent: boolean }) {
  const [message, setMessage] = useState("");
  const { pending, run, note } = useAction();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Emails <strong className="text-fg">{to}</strong> from info@ with the PDF attached and a download link.
      </p>
      <textarea className={cn(inputClass, "h-20 py-2")} placeholder="Optional message (otherwise a standard one is used)" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button className={cn(btn, "w-full bg-accent text-white")} disabled={pending} onClick={() => run(() => sendInvoice(id, message))}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} {sent ? "Send again" : "Send invoice"}
      </button>
      {note}
    </div>
  );
}

export function RecordPayment({ id, balance }: { id: string; balance: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [p, setP] = useState({ amount: balance, method: "Bank transfer", reference: "", receivedAt: today, note: "" });
  const { pending, run, note } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addPayment(id, p));
      }}
      className="space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        <input className={inputClass} placeholder="Amount" inputMode="decimal" value={p.amount} onChange={(e) => setP({ ...p, amount: e.target.value })} />
        <input className={inputClass} type="date" value={p.receivedAt} onChange={(e) => setP({ ...p, receivedAt: e.target.value })} />
      </div>
      <select className={inputClass} value={p.method} onChange={(e) => setP({ ...p, method: e.target.value })}>
        {["Bank transfer", "Wise", "PayPal", "Card", "Cash", "Western Union", "Other"].map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <input className={inputClass} placeholder="Reference / transaction ID" value={p.reference} onChange={(e) => setP({ ...p, reference: e.target.value })} />
      <button className={cn(btn, "w-full bg-emerald-600 text-white")} disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Record payment
      </button>
      {note}
    </form>
  );
}

export function RemovePayment({ paymentId }: { paymentId: string }) {
  const { pending, run } = useAction();
  return (
    <button type="button" aria-label="Remove payment" className="text-subtle hover:text-red-400" disabled={pending} onClick={() => confirm("Remove this payment?") && run(() => removePayment(paymentId))}>
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function VoidInvoice({ id }: { id: string }) {
  const { pending, run, note } = useAction();
  return (
    <div>
      <button type="button" className="text-xs font-semibold text-red-400 hover:underline" disabled={pending} onClick={() => confirm("Void this invoice? It stays on record but can't be paid or edited.") && run(() => voidInvoice(id))}>
        Void invoice
      </button>
      {note}
    </div>
  );
}
