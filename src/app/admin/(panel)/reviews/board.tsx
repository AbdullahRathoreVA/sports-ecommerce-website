"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, BadgeCheck, Check, Copy, EyeOff, HelpCircle, Loader2, Pencil, Plus, ShieldAlert, Sparkles, Star, Trash2 } from "lucide-react";
import { askReviewer, deleteReview, rejectReview, saveReview, setReview, verifyReview } from "./actions";
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
  title: string;
  response: string;
  modNote: string;
  verified: boolean;
  verifiedVia: string;
  verifiedNote: string;
  verifiedBy: string;
  consentAt: string;
  featured: boolean;
  published: boolean;
  pending: boolean;
  rejected: boolean;
  spam: boolean;
  rejectReason: string;
  /** Private hint: the email belongs to a customer with this many real orders (not proof). */
  customerOrders: number;
  orderNumber: string;
  source: string;
  createdAt: string;
};

type Editable = Pick<ReviewRow, "author" | "role" | "company" | "country" | "email" | "productLine" | "rating" | "quote" | "photo" | "title" | "response" | "modNote" | "featured" | "published">;
const EMPTY: Editable = { author: "", role: "", company: "", country: "", email: "", productLine: "", rating: 5, quote: "", photo: "", title: "", response: "", modNote: "", featured: false, published: true };

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

function ReviewEditor({ initial, id, productLines, onDone }: { initial: Editable; id: string | null; productLines: string[]; onDone: () => void }) {
  const router = useRouter();
  const [f, setF] = useState<Editable>({ author: initial.author, role: initial.role, company: initial.company, country: initial.country, email: initial.email, productLine: initial.productLine, rating: initial.rating, quote: initial.quote, photo: initial.photo, title: initial.title, response: initial.response, modNote: initial.modNote, featured: initial.featured, published: initial.published });
  const [genuine, setGenuine] = useState(Boolean(id));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const text = (k: keyof Editable, label: string, type = "text") => (
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
      <div className="sm:col-span-2">{text("title", "Headline (optional)")}</div>
      <div className="sm:col-span-2">
        <label htmlFor={`rv-${id ?? "new"}-quote`} className="mb-1 block text-xs font-medium text-muted">Review — the customer&apos;s own words (don&apos;t change their opinion)</label>
        <textarea id={`rv-${id ?? "new"}-quote`} rows={4} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} className={cn(inputClass, "h-auto py-3")} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`rv-${id ?? "new"}-resp`} className="mb-1 block text-xs font-medium text-muted">Public reply from Alrobel (optional, shown under the review)</label>
        <textarea id={`rv-${id ?? "new"}-resp`} rows={2} value={f.response} onChange={(e) => setF({ ...f, response: e.target.value })} className={cn(inputClass, "h-auto py-2")} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`rv-${id ?? "new"}-note`} className="mb-1 block text-xs font-medium text-muted">Private note (team only — never shown)</label>
        <textarea id={`rv-${id ?? "new"}-note`} rows={2} value={f.modNote} onChange={(e) => setF({ ...f, modNote: e.target.value })} className={cn(inputClass, "h-auto py-2")} />
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
        {(["published", "featured"] as const).map((k) => (
          <label key={k} className="inline-flex items-center gap-2">
            <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
            {k === "published" ? "Show on the website" : "Feature first"}
          </label>
        ))}
        <span className="text-xs text-subtle">&ldquo;Verified buyer&rdquo; is set with the Verify button (needs the order or invoice number).</span>
      </div>
      {f.published && (
        <label className="sm:col-span-2 inline-flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" checked={genuine} onChange={(e) => setGenuine(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
          These are a real customer&apos;s own words about a real order, and they agreed it can be shown with their name.
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
          {tab === "pending" ? "No reviews waiting. New reviews from the website land here first." : tab === "published" ? "No reviews on the website yet. Ask your real customers for honest feedback with the review links below." : tab === "rejected" ? "Nothing rejected." : "Nothing hidden."}
        </p>
      )}

      <ul className="grid gap-4 lg:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id} className={cn("rounded-[var(--radius-card)] border bg-surface p-5", r.pending ? "border-amber-400/40" : r.rejected ? "border-red-400/30" : "hairline")}>
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300" title={r.verifiedVia === "invite" ? "Came through a one-time review link for a real order" : `Checked by ${r.verifiedBy}: ${r.verifiedNote}`}>
                      <BadgeCheck className="h-3 w-3" aria-hidden /> Verified buyer · {r.verifiedVia === "invite" ? `invite${r.orderNumber ? ` ${r.orderNumber}` : ""}` : "checked by team"}
                    </span>
                  )}
                  {r.rejected && <span className="rounded-full bg-red-400/15 px-2 py-0.5 text-[11px] font-semibold text-red-200">{r.spam ? "Spam" : "Rejected"}{r.rejectReason ? ` — ${r.rejectReason}` : ""}</span>}
                  <span className="ml-auto text-xs text-subtle">{new Date(r.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })} · {r.source}</span>
                </div>
                {r.title && <p className="mt-3 font-semibold">{r.title}</p>}
                <blockquote className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">&ldquo;{r.quote}&rdquo;</blockquote>
                {r.response && (
                  <p className="mt-2 rounded-lg bg-white/[0.04] p-2 text-sm">
                    <span className="text-xs font-semibold text-subtle">Your public reply: </span>
                    {r.response}
                  </p>
                )}
                {r.modNote && (
                  <p className="mt-2 rounded-lg bg-amber-400/5 p-2 text-sm text-amber-100/80">
                    <span className="text-xs font-semibold">Private note: </span>
                    {r.modNote}
                  </p>
                )}
                {r.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photo} alt="" className="mt-3 h-32 rounded-xl object-cover" />
                )}
                <p className="mt-3 text-sm font-semibold">{r.author}</p>
                <p className="text-xs text-muted">{[r.role, r.company, r.country, r.productLine].filter(Boolean).join(" · ")}</p>
                {r.email && <p className="mt-0.5 text-xs text-subtle">{r.email} (private)</p>}
                <p className="mt-1 text-[11px] text-subtle">
                  {r.consentAt ? `Publication consent recorded ${new Date(r.consentAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : "No publication consent recorded — confirm with the customer before publishing."}
                </p>
                {!r.verified && r.customerOrders > 0 && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-sky-300">
                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> This email matches a customer with {r.customerOrders} order{r.customerOrders === 1 ? "" : "s"}. An email alone isn&apos;t proof — check, then Verify with the order number.
                  </p>
                )}
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
                    <Pencil className="h-4 w-4" aria-hidden /> Edit / reply
                  </button>
                  {r.verified ? (
                    <button type="button" disabled={busy} onClick={() => confirm("Remove the Verified buyer mark?") && act(() => verifyReview(r.id, null))} className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold text-muted">
                      <BadgeCheck className="h-4 w-4" aria-hidden /> Unverify
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const note = prompt("What did you check? Enter the order number (e.g. AL-261013-K3P9) or invoice number. Kept privately as proof.");
                        if (note) act(() => verifyReview(r.id, note));
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold"
                    >
                      <BadgeCheck className="h-4 w-4" aria-hidden /> Verify
                    </button>
                  )}
                  {r.email && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const m = prompt("Your question to the reviewer (sent by email from info@):");
                        if (m) act(() => askReviewer(r.id, m));
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold"
                    >
                      <HelpCircle className="h-4 w-4" aria-hidden /> Ask
                    </button>
                  )}
                  {!r.rejected && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const reason = prompt("Why are you rejecting it? (private — e.g. not a customer, abusive, duplicate). Genuine critical reviews should NOT be rejected.");
                        if (reason !== null) act(() => rejectReview(r.id, reason, /spam|bot|advert/i.test(reason)));
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border hairline px-3 text-sm font-semibold text-red-200"
                    >
                      <Ban className="h-4 w-4" aria-hidden /> Reject
                    </button>
                  )}
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
  const message = `Thank you for your order with Alrobel Sportswear! Could you tell us honestly how it went — good or bad? It takes two minutes: ${link}`;
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
      <p className="text-sm font-semibold">General review link</p>
      <p className="mt-1 text-sm text-muted">Anyone can use this link; reviews through it are NOT marked verified. For a verified review, create a one-time link for the order under &ldquo;Review requests&rdquo; below. Ask every customer, not only happy ones.</p>
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
