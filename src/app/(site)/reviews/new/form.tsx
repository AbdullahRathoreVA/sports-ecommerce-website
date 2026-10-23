"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, CheckCircle2, ImagePlus, Loader2, Star, X } from "lucide-react";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";
import { CONSENT_TEXT } from "@/lib/reviews/schema";

export type InviteInfo = { token: string; orderNumber: string | null } | null;

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewForm({ productLines, initial, invite }: { productLines: string[]; initial: { author: string; email: string; company: string; productLine?: string }; invite: InviteInfo }) {
  const [v, setV] = useState({ author: initial.author, email: initial.email, company: initial.company, role: "", country: "", productLine: initial.productLine ?? "", title: "", quote: "", website: "" });
  const [optedOut, setOptedOut] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (state === "done")
    return (
      <div className="mx-auto max-w-xl rounded-[var(--radius-card)] border hairline bg-surface p-10 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold">Thank you!</h2>
        <p className="mt-2 text-muted">Your review has been sent. Our team reads every review before it appears on the website.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-control)] border hairline px-5 font-semibold">Back to the website</Link>
      </div>
    );

  const field = (key: keyof typeof v, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`rv-${key}`} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input id={`rv-${key}`} value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} className={inputClass} {...props} />
    </div>
  );

  return (
    <form
      className="mx-auto grid max-w-3xl gap-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        if (!rating) return setErr("Please choose a star rating.");
        setState("sending");
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...v, rating, photo: photo ?? "", consent, ...(invite ? { invite: invite.token } : {}) }),
        }).catch(() => null);
        const body = res ? await res.json().catch(() => ({})) : {};
        if (res?.ok) setState("done");
        else {
          setState("idle");
          setErr((body as { error?: string }).error ?? "Couldn't send — please try again.");
        }
      }}
    >
      {invite && (
        <p className="flex items-start gap-2 rounded-[var(--radius-card)] bg-emerald-500/10 p-4 text-sm ring-1 ring-emerald-500/30">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
          <span>
            This private link is for your order{invite.orderNumber ? ` ${invite.orderNumber}` : ""}, so your review will show as <strong>Verified buyer</strong>. Please tell us honestly how it went — good or bad.
          </span>
        </p>
      )}
      <fieldset className="rounded-[var(--radius-card)] border hairline bg-surface p-6">
        <legend className="px-1 text-sm font-semibold">Your rating (required)</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <label key={i} onMouseEnter={() => setHover(i)} className="grid h-12 w-12 cursor-pointer place-items-center rounded-full transition-transform hover:scale-110 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
              <input type="radio" name="rating" value={i} checked={rating === i} onChange={() => setRating(i)} className="sr-only" required />
              <Star className={cn("h-9 w-9", i <= (hover || rating) ? "fill-[#f5b301] text-[#f5b301]" : "text-subtle")} aria-hidden />
              <span className="sr-only">
                {i} star{i === 1 ? "" : "s"} — {LABELS[i]}
              </span>
            </label>
          ))}
          <span className="ml-3 text-sm font-medium text-muted" aria-hidden>
            {LABELS[hover || rating]}
          </span>
        </div>
      </fieldset>

      <div className="grid gap-4 rounded-[var(--radius-card)] border hairline bg-surface p-6 sm:grid-cols-2">
        {field("author", "Your name", { required: true, autoComplete: "name" })}
        {field("email", "Email (never shown)", { required: true, type: "email", autoComplete: "email" })}
        {field("company", "Club, school or company")}
        {field("role", "Your role", { placeholder: "e.g. Coach, Kit manager, Owner" })}
        {field("country", "Country", { autoComplete: "country-name" })}
        <div>
          <label htmlFor="rv-line" className="mb-1.5 block text-sm font-medium">What did you order?</label>
          <select id="rv-line" value={v.productLine} onChange={(e) => setV({ ...v, productLine: e.target.value })} className={inputClass}>
            <option value="">Choose…</option>
            {productLines.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          {field("title", "Headline (optional)", { maxLength: 100, placeholder: "e.g. Kits matched the approved sample" })}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="rv-quote" className="mb-1.5 block text-sm font-medium">Your review</label>
          <textarea id="rv-quote" required rows={6} minLength={20} maxLength={1200} value={v.quote} onChange={(e) => setV({ ...v, quote: e.target.value })} placeholder="Communication, sample, sizing and fit, print and stitching, delivery — what went well, and what could be better?" className={cn(inputClass, "h-auto py-3")} />
          <p className="mt-1 text-right text-xs text-subtle">{v.quote.length} / 1200</p>
        </div>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium">Add a photo (optional)</p>
          {photo ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Your photo" className="h-28 w-40 rounded-xl object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-white">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border hairline px-4 text-sm font-semibold hover:border-accent">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
              Your team in the kit, or the product
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  const fd = new FormData();
                  fd.append("file", file);
                  const res = await fetch("/api/upload", { method: "POST", body: fd }).catch(() => null);
                  const body = res ? await res.json().catch(() => ({})) : {};
                  setUploading(false);
                  if (res?.ok && (body as { url?: string }).url) setPhoto((body as { url: string }).url);
                  else setErr((body as { error?: string }).error ?? "Photo upload failed — you can send the review without it.");
                }}
              />
            </label>
          )}
        </div>
        <input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} className="hidden" aria-hidden />
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" required />
        <span>{CONSENT_TEXT}</span>
      </label>
      <p className="-mt-3 text-xs text-subtle">Shown publicly: rating, headline, review, name, company, role, country, photo. Kept private: email{invite ? " and order details" : ""}.</p>

      <div>
        <button type="submit" disabled={state === "sending"} className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-7 font-semibold text-white hover:bg-accent-hover disabled:opacity-70">
          {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send my review
        </button>
        {err && <p className="mt-3 text-sm text-red-500" role="alert">{err}</p>}
      </div>
      {invite && (
        <p className="text-xs text-subtle">
          {optedOut ? (
            "Done — we won't send you review requests again."
          ) : (
            <button
              type="button"
              className="underline hover:text-fg"
              onClick={async () => {
                const r = await fetch("/api/reviews/opt-out", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invite: invite.token }) }).catch(() => null);
                if (r?.ok) setOptedOut(true);
              }}
            >
              Don&apos;t send me review requests again
            </button>
          )}
        </p>
      )}
    </form>
  );
}
