import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { requireCustomerPage } from "@/lib/customer-auth";
import { getSettings, whatsappLink } from "@/lib/settings";
import { LEAD_LABEL, TONE_CLASS } from "@/lib/portal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Quote request · Client portal" };
export const dynamic = "force-dynamic";

const STEPS = [
  { label: "Request received", done: () => true },
  { label: "Our team is reviewing", done: (s: string) => s !== "NEW" },
  { label: "Written quote sent", done: (s: string) => ["QUOTED", "NEGOTIATING", "WON"].includes(s) },
  { label: "Order confirmed", done: (s: string) => s === "WON" },
];

const REQ_LABEL: Record<string, string> = { material: "Material", colors: "Colours", branding: "Branding", sizes: "Sizes", sizeBreakdown: "Size breakdown", decoration: "Decoration", notes: "Notes" };

export default async function QuoteDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const customer = await requireCustomerPage(`/account/quotes/${number}`);
  if (!customer.verified) notFound();
  const lead = await db.lead.findFirst({
    // Scoped to the signed-in customer: another customer's number is simply "not found".
    where: { leadNumber: decodeURIComponent(number).toUpperCase(), customerId: customer.id },
    include: { product: { select: { slug: true, name: true } } },
  });
  if (!lead) notFound();
  const settings = await getSettings();
  const status = LEAD_LABEL[lead.status];
  const req = (lead.requirements ?? {}) as Record<string, unknown>;
  const rows = Object.entries(REQ_LABEL).flatMap(([k, label]) => (typeof req[k] === "string" && req[k] ? [[label, req[k] as string] as const] : []));
  const attachments = (Array.isArray(req.attachments) ? req.attachments : []).filter((a): a is string => typeof a === "string" && /^\/uploads\/[a-z0-9]{10,40}$/.test(a));
  const preview = (lead.design as { preview?: unknown } | null)?.preview;
  const wa = whatsappLink(settings, `Hi Alrobel, about my quote request ${lead.leadNumber}:`);
  // The customer's own words only; the chat transcript appended for the team stays internal.
  const message = lead.message?.split("\n— Assistant conversation —")[0]?.trim();

  return (
    <div className="container-x max-w-5xl pb-28 pt-8 lg:pb-24">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> My account
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl sm:text-4xl">{lead.product?.name ?? lead.productName ?? lead.category ?? (lead.design ? "Custom kit design" : "Quote request")}</h1>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", TONE_CLASS[status.tone])}>{status.label}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        <span className="font-mono">{lead.leadNumber}</span> · sent {lead.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {typeof preview === "string" && preview.startsWith("data:image/") && (
            <section className="overflow-hidden rounded-[var(--radius-card)] bg-ink p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your kit design, front and back" className="mx-auto max-h-[420px] w-auto" />
            </section>
          )}
          <section className="rounded-[var(--radius-card)] bg-surface p-6 ring-1 ring-black/[0.06]">
            <h2 className="font-semibold">Your request</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-subtle">Quantity</dt>
                <dd className="font-medium">{lead.quantity?.toLocaleString() ?? "Not given"}</dd>
              </div>
              <div>
                <dt className="text-subtle">Needed by</dt>
                <dd className="font-medium">{lead.targetDate ?? "Not given"}</dd>
              </div>
              {rows.map(([k, v]) => (
                <div key={k} className={k === "Notes" || k === "Size breakdown" ? "sm:col-span-2" : undefined}>
                  <dt className="text-subtle">{k}</dt>
                  <dd className="whitespace-pre-wrap font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {message && <blockquote className="mt-5 whitespace-pre-wrap rounded-md bg-surface-2 p-4 text-[15px] leading-relaxed">{message}</blockquote>}
            {attachments.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-3">
                {attachments.map((src) => (
                  <li key={src}>
                    <a href={src} target="_blank" rel="noopener" className="block h-24 w-24 overflow-hidden rounded-md bg-surface-2 ring-1 ring-black/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="Your attachment" className="h-full w-full object-contain" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[var(--radius-card)] bg-surface p-6 ring-1 ring-black/[0.06]">
            <h2 className="font-semibold">Progress</h2>
            {lead.status === "LOST" ? (
              <p className="mt-3 text-sm text-muted">This request is closed. Need it again? Send a new request or message us.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {STEPS.map((s) => {
                  const done = s.done(lead.status);
                  return (
                    <li key={s.label} className={cn("flex items-center gap-2.5 text-sm", done ? "font-semibold" : "text-subtle")}>
                      {done ? <CheckCircle2 className="h-5 w-5 text-accent" aria-hidden /> : <Circle className="h-5 w-5" aria-hidden />}
                      {s.label}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="mt-5 text-xs text-subtle">Every quote is sent in writing by email. Keep {lead.leadNumber} in your reply.</p>
          </section>
          <section className="on-dark rounded-[var(--radius-card)] bg-ink p-6 text-white">
            <h2 className="font-semibold">Add details or artwork</h2>
            <p className="mt-1 text-sm text-white/60">Size lists, logos or changes: send them with your reference.</p>
            <div className="mt-4 grid gap-2">
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1fae4b] text-sm font-semibold hover:bg-[#178f3d]">
                  <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                </a>
              )}
              <Link href={`/quote${lead.product ? `?product=${lead.product.slug}` : ""}`} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-white/15 text-sm font-semibold hover:bg-white/10">
                Send a follow-up request
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
