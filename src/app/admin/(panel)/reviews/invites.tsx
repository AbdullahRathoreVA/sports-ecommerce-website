"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { createInvite } from "./actions";
import { inputClass } from "@/components/forms/field";
import { fillTemplate, FEEDBACK_PROMPTS, REVIEW_TEMPLATES } from "@/lib/reviews/templates";
import { cn } from "@/lib/utils";

export type EligibleOrder = { id: string; orderNumber: string; name: string; email: string; company: string; productLine: string; status: string; date: string };
export type InviteRow = { id: string; name: string; email: string; orderNumber: string; channel: string; createdAt: string; sentAt: string; sendStatus: string; clickedAt: string; usedAt: string; expiresAt: string; optedOutAt: string };

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function LinkResult({ link, name, order, product }: { link: string; name: string; order: string; product: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const t = REVIEW_TEMPLATES[0]!;
  const vars = { name, order: order || "your order", link, product: product || "your order", company: "Alrobel Sportswear" };
  const wa = fillTemplate(t.whatsapp, vars);
  const mail = fillTemplate(t.email, vars);
  const btn = "inline-flex h-9 items-center gap-1.5 rounded-lg border hairline px-3 text-sm font-semibold";
  const doCopy = async (k: string, text: string) => (await copy(text)) && (setCopied(k), setTimeout(() => setCopied(null), 2000));
  return (
    <div className="mt-3 rounded-lg bg-emerald-500/5 p-3 ring-1 ring-emerald-500/20">
      <p className="text-xs text-muted">This link is shown only now — copy it before closing. It works once and expires in 60 days.</p>
      <code className="mt-2 block break-all rounded bg-white/[0.05] p-2 text-xs">{link}</code>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => doCopy("l", link)}>
          <Copy className="h-4 w-4" aria-hidden /> {copied === "l" ? "Copied" : "Copy link"}
        </button>
        <button type="button" className={btn} onClick={() => doCopy("w", wa)}>
          <Copy className="h-4 w-4" aria-hidden /> {copied === "w" ? "Copied" : "Copy WhatsApp message"}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(wa)}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1fae4b] px-3 text-sm font-semibold text-white">
          <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
        </a>
        <button type="button" className={btn} onClick={() => doCopy("e", mail)}>
          <Mail className="h-4 w-4" aria-hidden /> {copied === "e" ? "Copied" : "Copy email text"}
        </button>
      </div>
    </div>
  );
}

function InviteForm({ order }: { order?: EligibleOrder }) {
  const router = useRouter();
  const [f, setF] = useState({ name: order?.name ?? "", email: order?.email ?? "", productLine: order?.productLine ?? "" });
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ link?: string; text: string; ok: boolean } | null>(null);
  const go = (send: boolean) =>
    start(async () => {
      const r = await createInvite({ orderId: order?.id, ...f, send });
      setRes(r.ok ? { link: r.link, text: r.message, ok: true } : { text: r.error, ok: false });
      if (r.ok) router.refresh();
    });
  return (
    <div>
      {!order && (
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={inputClass} placeholder="Customer name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inputClass} placeholder="Customer email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className={inputClass} placeholder="What they ordered" value={f.productLine} onChange={(e) => setF({ ...f, productLine: e.target.value })} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => go(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-white disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} Email the request
        </button>
        <button type="button" disabled={pending} onClick={() => go(false)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border hairline px-3 text-sm font-semibold">
          Create link for WhatsApp
        </button>
      </div>
      {res && <p className={cn("mt-2 text-sm", res.ok ? "text-emerald-300" : "text-red-300")}>{res.text}</p>}
      {res?.link && <LinkResult link={res.link} name={f.name} order={order?.orderNumber ?? ""} product={f.productLine} />}
    </div>
  );
}

export function InvitePanel({ eligible, invites }: { eligible: EligibleOrder[]; invites: InviteRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const fmt = (d: string) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—");
  return (
    <section className="rounded-[var(--radius-card)] border hairline bg-surface p-5" aria-labelledby="rr-h">
      <h2 id="rr-h" className="text-sm font-semibold">Review requests</h2>
      <p className="mt-1 text-sm text-muted">
        Send a one-time link for a real order — the review is marked <strong className="text-fg">Verified buyer</strong>. Ask 7–14 days after delivery, send at most one reminder, never offer anything in return, and don&apos;t ask while a complaint is open.
      </p>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-subtle">Delivered / shipped orders without a request ({eligible.length})</h3>
      {eligible.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None yet. Orders appear here once you set them to Shipped or Delivered (Orders → Update order).</p>
      ) : (
        <ul className="mt-2 divide-y hairline">
          {eligible.map((o) => (
            <li key={o.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono font-semibold">{o.orderNumber}</span>
                <span>{o.company || o.name}</span>
                <span className="text-xs text-subtle">
                  {o.status.toLowerCase()} · {o.date}
                </span>
                <button type="button" onClick={() => setOpen(open === o.id ? null : o.id)} className="ml-auto text-sm font-semibold text-accent">
                  {open === o.id ? "Close" : "Ask for a review"}
                </button>
              </div>
              {open === o.id && (
                <div className="mt-2">
                  <InviteForm order={o} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-semibold">Ask a past customer who ordered outside the website</summary>
        <p className="mt-1 text-xs text-subtle">Only real customers. Reviews through this link are not marked verified until you check them against your records and press Verify.</p>
        <div className="mt-2">
          <InviteForm />
        </div>
      </details>

      {invites.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">Requests sent</h3>
          <table className="mt-2 w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs text-subtle">
              <tr>
                <th className="py-1.5">Customer</th>
                <th>Order</th>
                <th>Created</th>
                <th>Emailed</th>
                <th>Opened</th>
                <th>Reviewed</th>
              </tr>
            </thead>
            <tbody className="divide-y hairline">
              {invites.map((i) => (
                <tr key={i.id}>
                  <td className="py-1.5">
                    {i.name}
                    <span className="block text-xs text-subtle">{i.email}</span>
                  </td>
                  <td className="font-mono text-xs">{i.orderNumber || "—"}</td>
                  <td>{fmt(i.createdAt)}</td>
                  <td>{i.sentAt ? fmt(i.sentAt) : i.sendStatus === "skipped" ? "not sent" : "—"}</td>
                  <td>{fmt(i.clickedAt)}</td>
                  <td>{i.usedAt ? fmt(i.usedAt) : i.optedOutAt ? "opted out" : new Date(i.expiresAt) < new Date() ? "expired" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function TemplatesPanel() {
  const [copied, setCopied] = useState<string | null>(null);
  const doCopy = async (k: string, text: string) => (await copy(text)) && (setCopied(k), setTimeout(() => setCopied(null), 2000));
  return (
    <details className="rounded-[var(--radius-card)] border hairline bg-surface p-5">
      <summary className="cursor-pointer text-sm font-semibold">Message templates (email & WhatsApp) and feedback questions</summary>
      <p className="mt-2 text-xs text-subtle">Replace {"{name}"}, {"{order}"}, {"{link}"} before sending. Every template asks for honest feedback and offers nothing in return.</p>
      <ul className="mt-3 space-y-3">
        {REVIEW_TEMPLATES.map((t) => (
          <li key={t.id} className="rounded-lg bg-white/[0.03] p-3">
            <p className="text-sm font-semibold">{t.label}</p>
            <p className="text-xs text-subtle">{t.when}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => doCopy(`${t.id}-e`, `${t.subject ? `Subject: ${t.subject}\n\n` : ""}${t.email}`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border hairline px-2.5 text-xs font-semibold">
                <Mail className="h-3.5 w-3.5" aria-hidden /> {copied === `${t.id}-e` ? "Copied" : "Copy email"}
              </button>
              <button type="button" onClick={() => doCopy(`${t.id}-w`, t.whatsapp)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border hairline px-2.5 text-xs font-semibold">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden /> {copied === `${t.id}-w` ? "Copied" : "Copy WhatsApp"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-subtle">Questions to help customers write useful reviews (in their own words)</h3>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {FEEDBACK_PROMPTS.map((g) => (
          <li key={g.line} className="rounded-lg bg-white/[0.03] p-3 text-sm">
            <p className="font-semibold">{g.line}</p>
            <ul className="mt-1 list-disc pl-4 text-muted">
              {g.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </details>
  );
}
