"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, Copy, EyeOff, Loader2, Pencil, Plus, Sparkles, Star, Trash2 } from "lucide-react";
import { deleteReview, saveReview, setReview } from "./actions";
import { ImageUploader } from "@/components/admin/uploader";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

export type ReviewRow = {
  id: string;
  author: string;
  role: string;
  company: string;
  country: string;
  email: string;
  productLine: string;
  rating: number | null;
  quote: string;
  photo: string;
  verified: boolean;
  featured: boolean;
  published: boolean;
  pending: boolean;
  source: string;
  createdAt: string;
};

const EMPTY: Omit<ReviewRow, "id" | "pending" | "source" | "createdAt"> = { author: "", role: "", company: "", country: "", email: "", productLine: "", rating: 5, quote: "", photo: "", verified: false, featured: false, published: true };

function StarsInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange(value === i ? null : i)} aria-label={`${i} stars`} className="grid h-9 w-9 place-items-center">
          <Star className={cn("h-6 w-6", value && i <= value ? "fill-[#f5b301] text-[#f5b301]" : "text-white/25")} aria-hidden />
        </button>
      ))}
    </div>
  );
}

function ReviewEditor({ initial, id, productLines, onDone }: { initial: typeof EMPTY; id: string | null; productLines: string[]; onDone: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [genuine, setGenuine] = useState(Boolean(id));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const text = (k: keyof typeof EMPTY, label: string, type = "text") => (
    <div>
      <label htmlFor={`rv-${id ?? "new"}-${k}`} className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <input id={`rv-${id ?? "new"}-${k}`} type={type} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={inputClass} />
    </div>
  );
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await saveReview(id, { ...f, confirmGenuine: genuine });
          setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
          if (r.ok) {
            router.refresh();
            onDone();
          }
        });
      }}
    >
      <div className="sm:col-span-2">
        <p className="mb-1 text-xs font-medium text-muted">Stars</p>
        <StarsInput value={f.rating} onChange={(rating) => setF({ ...f, rating })} />
      </div>
      {text("author", "Name")}
      {text("company", "Club / school / company")}
      {text("role", "Role")}
      {text("country", "Country")}
      {text("email", "Email (private)", "email")}
      <div>
        <label htmlFor={`rv-${id ?? "new"}-line`} className="mb-1 block text-xs font-medium text-muted">Product line</label>
        <select id={`rv-${id ?? "new"}-line`} value={f.productLine} onChange={(e) => setF({ ...f, productLine: e.target.value })} className={inputClass}>
          <option value="">—</option>
          {productLines.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`rv-${id ?? "new"}-quote`} className="mb-1 block text-xs font-medium text-muted">Review</label>
        <textarea id={`rv-${id ?? "new"}-quote`} rows={4} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} className={cn(inputClass, "h-auto py-3")} />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        {f.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.photo} alt="" className="h-16 w-24 rounded-lg object-cover" />
        )}
        <ImageUploader multiple={false} label={f.photo ? "Change photo" : "Add a photo"} onUploaded={(u) => setF((p) => ({ ...p, photo: u.url }))} />
        {f.photo && (
          <button type="button" onClick={() => setF({ ...f, photo: "" })} className="text-xs text-subtle hover:text-fg">Remove photo</button>
        )}
      </div>
      <div className="sm:col-span-2 flex flex-wrap gap-4 text-sm">
        {(["published", "featured", "verified"] as const).map((k) => (
          <label key={k} className="inline-flex items-center gap-2">
            <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
            {k === "published" ? "Show on the website" : k === "featured" ? "Feature first" : "Verified buyer"}
          </label>
        ))}
      </div>
      {f.published && (
        <label className="sm:col-span-2 inline-flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" checked={genuine} onChange={(e) => setGenuine(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
          This is a genuine review from a real customer, and they agreed it can be shown.
        </label>
      )}
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-70">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save review
        </button>
        <button type="button" onClick={onDone} className="h-11 rounded-[var(--radius-control)] border hairline px-4 text-sm font-semibold">Cancel</button>
        {msg && <p className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-red-300")}>{msg.text}</p>}
      </div>
    </form>
  );
}

export function ReviewBoard({ rows, tab, productLines }: { rows: ReviewRow[]; tab: string; productLines: string[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [armed, setArmed] = useState<string | null>(null);
  const act = (fn: () => Promise<unknown>) => start(async () => {
    await fn();
    router.refresh();
  });

  return (
    <div className="space-y-4">
      {adding ? (
        <div className="rounded-[var(--radius-card)] border border-accent/40 bg-surface p-5">
          <h2 className="mb-4 text-sm font-semibold">Add a review you received (WhatsApp, email, in person)</h2>
          <ReviewEditor id={null} initial={EMPTY} productLines={productLines} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-accent-ink">
          <Plus className="h-4 w-4" aria-hidden /> Add a review
        </button>
      )}

      {rows.length === 0 && (
        <p className="rounded-[var(--radius-card)] border hairline bg-surface p-8 text-center text-sm text-muted">
          {tab === "pending" ? "No reviews waiting. New reviews from the website land here first." : tab === "published" ? "No reviews on the website yet. Send happy customers the review link above." : "Nothing hidden."}
        </p>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id} className={cn("rounded-[var(--radius-card)] border bg-surface p-5", r.pending ? "border-amber-400/40" : "hairline")}>
            {editing === r.id ? (
              <ReviewEditor id={r.id} initial={r} productLines={productLines} onDone={() => setEditing(null)} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {r.rating ? (
                    <span className="inline-flex">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={cn("h-4 w-4", i <= r.rating! ? "fill-[#f5b301] text-[#f5b301]" : "text-white/20")} aria-hidden />
                      ))}
                    </span>
                  ) : null}
                  {r.pending && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">New — from the website</span>}
                  {r.featured && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">Featured</span>}
                  {r.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                      <BadgeCheck className="h-3 w-3" aria-hidden /> Verified buyer
                    </span>
                  )}
                  <span className="ml-auto text-xs text-subtle">{new Date(r.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })} · {r.source}</span>
                </div>
                <blockquote className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">&ldquo;{r.quote}&rdquo;</blockquote>
                {r.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo} alt="" className="mt-3 h-32 rounded-xl object-cover" />
                )}
                <p className="mt-3 text-sm font-semibold">{r.author}</p>
                <p className="text-xs text-muted">{[r.role, r.company, r.country, r.productLine].filter(Boolean).join(" · ")}</p>
                {r.email && <p className="mt-0.5 text-xs text-subtle">{r.email} (private)</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {!r.published ? (
                    <button type="button" disabled={busy} onClick={() => act(() => setReview(r.id, { published: true }))} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 text-sm font-semibold text-white">
                      <Check className="h-4 w-4" aria-hidden /> Publish
                    </button>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => act(() => setReview(r.id, { published: false }))} className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold">
                      <EyeOff className="h-4 w-4" aria-hidden /> Hide
                    </button>
                  )}
                  {r.pending && (
                    <button type="button" disabled={busy} onClick={() => act(() => setReview(r.id, { published: false }))} className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold">
                      <EyeOff className="h-4 w-4" aria-hidden /> Don&apos;t publish
                    </button>
                  )}
                  <button type="button" disabled={busy} onClick={() => act(() => setReview(r.id, { featured: !r.featured }))} className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold">
                    <Sparkles className="h-4 w-4" aria-hidden /> {r.featured ? "Unfeature" : "Feature"}
                  </button>
                  <button type="button" onClick={() => setEditing(r.id)} className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold">
                    <Pencil className="h-4 w-4" aria-hidden /> Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (armed === r.id ? act(() => deleteReview(r.id)) : setArmed(r.id))}
                    className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold", armed === r.id ? "border-red-400/60 bg-red-500/10 text-red-200" : "hairline text-muted")}
                  >
                    {busy && armed === r.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                    {armed === r.id ? "Tap again to delete" : "Delete"}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Copy the review link / a ready WhatsApp message to send to happy customers. */
export function AskForReview({ link }: { link: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const message = `Thank you for your order with Alrobel Sportswear! If you're happy with it, would you leave us a short review? It takes two minutes: ${link}`;
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="rounded-[var(--radius-card)] border hairline bg-surface p-5">
      <p className="text-sm font-semibold">Ask a customer for a review</p>
      <p className="mt-1 text-sm text-muted">Send this after delivery. Reviews from customers whose email matches a real order are marked “Verified buyer” automatically.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <code className="flex h-10 items-center rounded-lg bg-white/[0.05] px-3 text-sm">{link}</code>
        <button type="button" onClick={() => copy("link", link)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border hairline px-3 text-sm font-semibold">
          <Copy className="h-4 w-4" aria-hidden /> {copied === "link" ? "Copied" : "Copy link"}
        </button>
        <button type="button" onClick={() => copy("msg", message)} className="inline-flex h-10 items-center gap-1.5 rounded-lg border hairline px-3 text-sm font-semibold">
          <Copy className="h-4 w-4" aria-hidden /> {copied === "msg" ? "Copied" : "Copy WhatsApp message"}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center rounded-lg bg-[#1fae4b] px-3 text-sm font-semibold text-white">
          Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
