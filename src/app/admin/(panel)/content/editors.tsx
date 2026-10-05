"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { deleteContent, purgeDemoData, saveCertification, saveFaq, savePost, saveTestimonial, type Result } from "./actions";
import { ImageUploader } from "@/components/admin/uploader";
import { inputClass } from "@/components/forms/field";
import { cn, slugify } from "@/lib/utils";

const area = cn(inputClass, "h-auto py-2.5 leading-relaxed");
type Kind = "faq" | "testimonial" | "certification" | "post";

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<Result>, after?: () => void) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: r.message ?? "Saved." } : { ok: false, text: r.error });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  };
  return { pending, msg, run };
}

function In({ id, label, children, hint, wide }: { id: string; label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-subtle">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function Actions({ kind, id, pending, msg, onCancel }: { kind: Kind; id: string | null; pending: boolean; msg: { ok: boolean; text: string } | null; onCancel?: () => void }) {
  const del = useSave();
  return (
    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
      <button type="submit" disabled={pending} className="flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-70">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Save
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="h-11 rounded-[var(--radius-control)] border hairline px-4 text-sm font-medium text-muted">Cancel</button>
      )}
      {id && (
        <button
          type="button"
          disabled={del.pending}
          onClick={() => confirm("Delete this permanently?") && del.run(() => deleteContent(kind, id))}
          className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm font-medium text-red-300 hover:bg-red-400/10"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Delete
        </button>
      )}
      {(msg ?? del.msg) && <p className={cn("w-full text-sm", (msg ?? del.msg)!.ok ? "text-emerald-300" : "text-red-300")} role="status">{(msg ?? del.msg)!.text}</p>}
    </div>
  );
}

function Item({ title, meta, open, onToggle, children }: { title: string; meta?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border hairline bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title || "Untitled"}</span>
          {meta && <span className="mt-0.5 block text-xs text-subtle">{meta}</span>}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-subtle transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="border-t hairline p-4">{children}</div>}
    </li>
  );
}

function List<T extends { id: string }>({ items, blank, render, title, meta, addLabel }: { items: T[]; blank: () => T; render: (item: T, close: () => void) => React.ReactNode; title: (t: T) => string; meta: (t: T) => React.ReactNode; addLabel: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  return (
    <div className="space-y-3">
      {draft ? (
        <div className="rounded-xl border border-accent/40 bg-surface p-4">{render(draft, () => setDraft(null))}</div>
      ) : (
        <button type="button" onClick={() => setDraft(blank())} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-ink">
          <Plus className="h-4 w-4" aria-hidden /> {addLabel}
        </button>
      )}
      <ul className="space-y-2">
        {items.map((it) => (
          <Item key={it.id} title={title(it)} meta={meta(it)} open={open === it.id} onToggle={() => setOpen(open === it.id ? null : it.id)}>
            {render(it, () => setOpen(null))}
          </Item>
        ))}
      </ul>
    </div>
  );
}

const pub = (p: boolean) => (p ? <span className="text-emerald-300">Published</span> : <span>Hidden</span>);

/* ── FAQs ── */

export type FaqRow = { id: string; question: string; answer: string; topic: string; position: number; published: boolean };

function FaqForm({ row, close }: { row: FaqRow; close: () => void }) {
  const [f, setF] = useState(row);
  const { pending, msg, run } = useSave();
  const id = row.id.startsWith("new") ? null : row.id;
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => saveFaq(id, { question: f.question, answer: f.answer, topic: f.topic, position: f.position, published: f.published }), id ? undefined : close); }}>
      <In id={`fq-${row.id}`} label="Question" wide><input id={`fq-${row.id}`} value={f.question} maxLength={200} onChange={(e) => setF({ ...f, question: e.target.value })} className={inputClass} /></In>
      <In id={`fa-${row.id}`} label="Answer" wide><textarea id={`fa-${row.id}`} rows={4} value={f.answer} maxLength={3000} onChange={(e) => setF({ ...f, answer: e.target.value })} className={area} /></In>
      <In id={`ft-${row.id}`} label="Topic" hint="e.g. ordering, shipping"><input id={`ft-${row.id}`} value={f.topic} maxLength={40} onChange={(e) => setF({ ...f, topic: e.target.value })} className={inputClass} /></In>
      <In id={`fp-${row.id}`} label="Order" hint="Lower first"><input id={`fp-${row.id}`} inputMode="numeric" value={f.position} onChange={(e) => setF({ ...f, position: Number(e.target.value.replace(/\D/g, "")) || 0 })} className={inputClass} /></In>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Published</label>
      <Actions kind="faq" id={id} pending={pending} msg={msg} onCancel={id ? undefined : close} />
    </form>
  );
}

export function FaqEditor({ items }: { items: FaqRow[] }) {
  return (
    <List
      items={items}
      addLabel="Add FAQ"
      blank={() => ({ id: `new-${Date.now()}`, question: "", answer: "", topic: "general", position: items.length, published: true })}
      title={(t) => t.question}
      meta={(t) => <>{t.topic} · {pub(t.published)}</>}
      render={(row, close) => <FaqForm row={row} close={close} />}
    />
  );
}

/* ── Testimonials ── */

export type TestimonialRow = { id: string; author: string; role: string; company: string; country: string; quote: string; position: number; published: boolean };

function TestimonialForm({ row, close }: { row: TestimonialRow; close: () => void }) {
  const [f, setF] = useState(row);
  const [genuine, setGenuine] = useState(row.published);
  const { pending, msg, run } = useSave();
  const id = row.id.startsWith("new") ? null : row.id;
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => saveTestimonial(id, { author: f.author, role: f.role, company: f.company, country: f.country, quote: f.quote, position: f.position, published: f.published, confirmGenuine: genuine }), id ? undefined : close); }}>
      <In id={`ta-${row.id}`} label="Name"><input id={`ta-${row.id}`} value={f.author} maxLength={80} onChange={(e) => setF({ ...f, author: e.target.value })} className={inputClass} /></In>
      <In id={`tr-${row.id}`} label="Role" hint="Optional"><input id={`tr-${row.id}`} value={f.role} maxLength={80} onChange={(e) => setF({ ...f, role: e.target.value })} className={inputClass} /></In>
      <In id={`tc-${row.id}`} label="Company / club" hint="Optional"><input id={`tc-${row.id}`} value={f.company} maxLength={80} onChange={(e) => setF({ ...f, company: e.target.value })} className={inputClass} /></In>
      <In id={`tn-${row.id}`} label="Country" hint="Optional"><input id={`tn-${row.id}`} value={f.country} maxLength={60} onChange={(e) => setF({ ...f, country: e.target.value })} className={inputClass} /></In>
      <In id={`tq-${row.id}`} label="Quote" wide><textarea id={`tq-${row.id}`} rows={3} value={f.quote} maxLength={800} onChange={(e) => setF({ ...f, quote: e.target.value })} className={area} /></In>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Published</label>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={genuine} onChange={(e) => setGenuine(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
        <span>This is a real customer&apos;s words and they agreed to it being published. <span className="text-subtle">Invented reviews break advertising law in the US, UK and EU.</span></span>
      </label>
      <Actions kind="testimonial" id={id} pending={pending} msg={msg} onCancel={id ? undefined : close} />
    </form>
  );
}

export function TestimonialEditor({ items }: { items: TestimonialRow[] }) {
  return (
    <List
      items={items}
      addLabel="Add testimonial"
      blank={() => ({ id: `new-${Date.now()}`, author: "", role: "", company: "", country: "", quote: "", position: items.length, published: false })}
      title={(t) => `${t.author}${t.company ? `, ${t.company}` : ""}`}
      meta={(t) => pub(t.published)}
      render={(row, close) => <TestimonialForm row={row} close={close} />}
    />
  );
}

/* ── Certifications ── */

export type CertRow = { id: string; name: string; issuer: string; reference: string; validUntil: string; fileUrl: string; position: number; published: boolean };

function CertForm({ row, close }: { row: CertRow; close: () => void }) {
  const [f, setF] = useState(row);
  const { pending, msg, run } = useSave();
  const id = row.id.startsWith("new") ? null : row.id;
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => saveCertification(id, { name: f.name, issuer: f.issuer, reference: f.reference, validUntil: f.validUntil, fileUrl: f.fileUrl, position: f.position, published: f.published }), id ? undefined : close); }}>
      <In id={`cn-${row.id}`} label="Certification"><input id={`cn-${row.id}`} value={f.name} maxLength={80} placeholder="e.g. OEKO-TEX Standard 100" onChange={(e) => setF({ ...f, name: e.target.value })} className={inputClass} /></In>
      <In id={`ci-${row.id}`} label="Issued by"><input id={`ci-${row.id}`} value={f.issuer} maxLength={80} onChange={(e) => setF({ ...f, issuer: e.target.value })} className={inputClass} /></In>
      <In id={`cr-${row.id}`} label="Certificate number"><input id={`cr-${row.id}`} value={f.reference} maxLength={80} onChange={(e) => setF({ ...f, reference: e.target.value })} className={inputClass} /></In>
      <In id={`cv-${row.id}`} label="Valid until" hint="Optional"><input id={`cv-${row.id}`} type="date" value={f.validUntil} onChange={(e) => setF({ ...f, validUntil: e.target.value })} className={inputClass} /></In>
      <In id={`cf-${row.id}`} label="Certificate link" hint="Optional" wide><input id={`cf-${row.id}`} value={f.fileUrl} maxLength={300} placeholder="https://… (issuer's verification page)" onChange={(e) => setF({ ...f, fileUrl: e.target.value })} className={inputClass} /></In>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Published <span className="text-subtle">— needs issuer and certificate number</span></label>
      <Actions kind="certification" id={id} pending={pending} msg={msg} onCancel={id ? undefined : close} />
    </form>
  );
}

export function CertEditor({ items }: { items: CertRow[] }) {
  return (
    <List
      items={items}
      addLabel="Add certification"
      blank={() => ({ id: `new-${Date.now()}`, name: "", issuer: "", reference: "", validUntil: "", fileUrl: "", position: items.length, published: false })}
      title={(t) => t.name}
      meta={(t) => <>{t.issuer || "Issuer not set"} · {pub(t.published)}</>}
      render={(row, close) => <CertForm row={row} close={close} />}
    />
  );
}

/* ── Buyer guides ── */

export type PostRow = { id: string; title: string; slug: string; excerpt: string; body: string; coverImage: string; coverAlt: string; topic: string; published: boolean; seoTitle: string; seoDesc: string };

function PostForm({ row, close }: { row: PostRow; close: () => void }) {
  const [f, setF] = useState(row);
  const id = row.id.startsWith("new") ? null : row.id;
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const { pending, msg, run } = useSave();
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const { id: _omit, ...data } = f; void _omit; run(() => savePost(id, data), id ? undefined : close); }}>
      <In id={`pt-${row.id}`} label="Title" wide><input id={`pt-${row.id}`} value={f.title} maxLength={140} onChange={(e) => setF({ ...f, title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} className={inputClass} /></In>
      <In id={`ps-${row.id}`} label="URL slug" hint="/insights/…"><input id={`ps-${row.id}`} value={f.slug} maxLength={100} onChange={(e) => { setSlugTouched(true); setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }); }} className={inputClass} /></In>
      <In id={`pc-${row.id}`} label="Topic"><input id={`pc-${row.id}`} value={f.topic} maxLength={40} onChange={(e) => setF({ ...f, topic: e.target.value })} className={inputClass} /></In>
      <In id={`pe-${row.id}`} label="Excerpt" wide><textarea id={`pe-${row.id}`} rows={2} value={f.excerpt} maxLength={400} onChange={(e) => setF({ ...f, excerpt: e.target.value })} className={area} /></In>
      <In id={`pb-${row.id}`} label="Body" hint="Markdown" wide><textarea id={`pb-${row.id}`} rows={14} value={f.body} maxLength={60000} onChange={(e) => setF({ ...f, body: e.target.value })} className={cn(area, "font-mono text-sm")} /></In>
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-sm font-medium">Cover image</p>
        {f.coverImage ? (
          <div className="flex items-center gap-3">
            <span className="relative aspect-video w-40 overflow-hidden rounded-lg bg-surface-2"><Image src={f.coverImage} alt="" fill sizes="160px" className="object-cover" /></span>
            <button type="button" onClick={() => setF({ ...f, coverImage: "" })} className="text-sm text-red-300">Remove</button>
          </div>
        ) : (
          <ImageUploader multiple={false} label="Upload a cover image" onUploaded={(u) => setF((p) => ({ ...p, coverImage: u.url, coverAlt: p.coverAlt || p.title }))} />
        )}
      </div>
      <In id={`pa-${row.id}`} label="Cover description" hint="Alt text" wide><input id={`pa-${row.id}`} value={f.coverAlt} maxLength={200} onChange={(e) => setF({ ...f, coverAlt: e.target.value })} className={inputClass} /></In>
      <In id={`pst-${row.id}`} label="SEO title" hint="Optional"><input id={`pst-${row.id}`} value={f.seoTitle} maxLength={70} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} className={inputClass} /></In>
      <In id={`psd-${row.id}`} label="Meta description" hint="Optional"><input id={`psd-${row.id}`} value={f.seoDesc} maxLength={170} onChange={(e) => setF({ ...f, seoDesc: e.target.value })} className={inputClass} /></In>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.published} onChange={(e) => setF({ ...f, published: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Published</label>
      <Actions kind="post" id={id} pending={pending} msg={msg} onCancel={id ? undefined : close} />
    </form>
  );
}

export function PostEditor({ items }: { items: PostRow[] }) {
  return (
    <List
      items={items}
      addLabel="New guide"
      blank={() => ({ id: `new-${Date.now()}`, title: "", slug: "", excerpt: "", body: "", coverImage: "", coverAlt: "", topic: "guide", published: false, seoTitle: "", seoDesc: "" })}
      title={(t) => t.title}
      meta={(t) => <>/insights/{t.slug} · {pub(t.published)}</>}
      render={(row, close) => <PostForm row={row} close={close} />}
    />
  );
}

/* ── Sample data ── */

export function PurgeDemo({ counts, allowed }: { counts: { orders: number; leads: number; customers: number; sessions: number }; allowed: boolean }) {
  const [text, setText] = useState("");
  const { pending, msg, run } = useSave();
  const total = counts.orders + counts.leads + counts.customers + counts.sessions;
  return (
    <div className="rounded-[var(--radius-card)] border border-red-400/25 bg-surface p-4 sm:p-6">
      <h2 className="text-base font-semibold">Sample data</h2>
      <p className="mt-1 text-sm text-muted">
        The preview dashboard is filled with simulated activity so you can see how it works: {counts.orders} orders, {counts.leads} leads, {counts.customers} customers and {counts.sessions.toLocaleString()} visits. Delete it before launch so the numbers you see are only real.
        Real orders, leads and visits are never touched.
      </p>
      {total === 0 ? (
        <p className="mt-4 text-sm text-emerald-300">No sample data left — every number in the dashboard is real.</p>
      ) : !allowed ? (
        <p className="mt-4 text-sm text-subtle">Only an owner or admin can delete sample data.</p>
      ) : (
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); run(() => purgeDemoData(text)); }}>
          <label htmlFor="purge" className="sr-only">Type DELETE SAMPLE DATA to confirm</label>
          <input id="purge" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type DELETE SAMPLE DATA" autoComplete="off" className={cn(inputClass, "h-11 max-w-xs")} />
          <button disabled={pending || text.trim().toUpperCase() !== "DELETE SAMPLE DATA"} className="flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-red-500 px-4 text-sm font-semibold text-white disabled:opacity-40">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Delete sample data
          </button>
        </form>
      )}
      {msg && <p className={cn("mt-3 text-sm", msg.ok ? "text-emerald-300" : "text-red-300")} role="status">{msg.text}</p>}
    </div>
  );
}
