"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { addOrderNote, attachOrderPhoto, removeOrderAttachment, updateOrder } from "../actions";
import { ImageUploader } from "@/components/admin/uploader";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "MANUFACTURING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const PAYMENT_STATUSES = ["UNPAID", "PENDING", "PARTIALLY_PAID", "PAID", "REFUNDED", "FAILED"];
const SHIPPING_STATUSES = ["NOT_SHIPPED", "PACKED", "IN_TRANSIT", "DELIVERED", "RETURNED"];
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

type OrderState = { status: string; paymentStatus: string; shippingStatus: string; carrier: string; trackingNumber: string; internalNotes: string };

export function OrderControls({ orderId, initial }: { orderId: string; initial: OrderState }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [notify, setNotify] = useState(true);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const statusChanged = s.status !== initial.status;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          // Values come from the fixed option lists above; the server action re-validates with zod.
          const r = await updateOrder(orderId, { ...s, notifyCustomer: notify } as Parameters<typeof updateOrder>[1]);
          setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        });
      }}
    >
      {(
        [
          ["status", "Order status", ORDER_STATUSES],
          ["paymentStatus", "Payment", PAYMENT_STATUSES],
          ["shippingStatus", "Shipping", SHIPPING_STATUSES],
        ] as const
      ).map(([key, title, options]) => (
        <div key={key}>
          <label htmlFor={`oc-${key}`} className="mb-1.5 block text-sm font-medium">{title}</label>
          <select id={`oc-${key}`} value={s[key]} onChange={(e) => setS({ ...s, [key]: e.target.value })} className={inputClass}>
            {options.map((o) => (
              <option key={o} value={o}>{label(o)}</option>
            ))}
          </select>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="oc-carrier" className="mb-1.5 block text-sm font-medium">Carrier</label>
          <input id="oc-carrier" value={s.carrier} maxLength={80} onChange={(e) => setS({ ...s, carrier: e.target.value })} placeholder="DHL Express" className={inputClass} />
        </div>
        <div>
          <label htmlFor="oc-tracking" className="mb-1.5 block text-sm font-medium">Tracking no.</label>
          <input id="oc-tracking" value={s.trackingNumber} maxLength={80} onChange={(e) => setS({ ...s, trackingNumber: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="oc-notes" className="mb-1.5 block text-sm font-medium">Internal notes <span className="font-normal text-subtle">(never shown to the customer)</span></label>
        <textarea id="oc-notes" rows={3} value={s.internalNotes} maxLength={4000} onChange={(e) => setS({ ...s, internalNotes: e.target.value })} className={cn(inputClass, "h-auto py-2.5")} />
      </div>
      {statusChanged && (
        <label className="flex items-start gap-2.5 rounded-xl bg-accent/[0.06] p-3 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
          <span>Email the customer about this status change <span className="text-subtle">(saved in the timeline as a written record)</span></span>
        </label>
      )}
      <button type="submit" disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent font-semibold text-accent-ink disabled:opacity-70">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save changes
      </button>
      {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">{msg.text}</p>}
    </form>
  );
}

export function NoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addOrderNote(orderId, note);
          if (r.ok) {
            setNote("");
            router.refresh();
          }
        });
      }}
    >
      <label htmlFor="note" className="sr-only">Add a note</label>
      <input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Add a note to the timeline…" className={inputClass} />
      <button disabled={pending || !note.trim()} className="h-12 shrink-0 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink disabled:opacity-50">Add</button>
    </form>
  );
}

export function OrderPhotos({ orderId, photos }: { orderId: string; photos: { id: string; url: string; kind: string; caption: string | null; uploadedBy: string | null; createdAt: string }[] }) {
  const router = useRouter();
  const [kind, setKind] = useState("qc");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Photo type:</span>
        {["qc", "packing", "dispatch", "document"].map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("h-9 rounded-full border px-3 font-medium capitalize", kind === k ? "border-white bg-white text-ink" : "hairline text-muted")}>
            {k === "qc" ? "QC check" : k}
          </button>
        ))}
      </div>
      <ImageUploader
        label="Add QC / packing photos"
        onUploaded={async (u, file) => {
          await attachOrderPhoto(orderId, { mediaId: u.id, kind: kind as "qc", caption: file.name.replace(/\.\w+$/, "").slice(0, 120) });
          router.refresh();
        }}
      />
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-xl border hairline">
              <a href={p.url} target="_blank" rel="noopener" className="relative block aspect-square bg-surface-2">
                <Image src={p.url} alt={p.caption ?? `${p.kind} photo`} fill sizes="200px" className="object-cover" />
              </a>
              <div className="flex items-start justify-between gap-2 p-2 text-xs">
                <span className="min-w-0">
                  <span className="block font-semibold uppercase text-accent">{p.kind}</span>
                  <span className="block truncate text-subtle">{new Date(p.createdAt).toLocaleString("en-GB")} · {p.uploadedBy}</span>
                </span>
                <button
                  type="button"
                  aria-label="Remove photo"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("Remove this photo from the order?")) return;
                    start(async () => {
                      await removeOrderAttachment(p.id);
                      router.refresh();
                    });
                  }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-subtle hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
