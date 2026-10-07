import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bot, Mail, MessageCircle, Phone, Sparkles } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, LEAD_TONE, humanise } from "@/components/admin/ui";
import { EmailComposer } from "@/components/admin/email-composer";
import { LeadControls, LeadNoteForm } from "./controls";
import { emailLead } from "../actions";
import { countryLabel } from "@/lib/admin/insights";

export const metadata: Metadata = { title: "Lead" };

const REQ_LABEL: Record<string, string> = {
  material: "Material",
  colors: "Colours",
  branding: "Branding",
  sizes: "Sizes",
  sizeBreakdown: "Size breakdown",
  decoration: "Decoration",
  notes: "Notes",
};

function show(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (Array.isArray(v)) return v.length ? v.join(", ") : null;
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${x}`).join(" · ");
  return String(v);
}

type Msg = { role: string; content: string };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("manageLeads");
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      notes: { orderBy: { createdAt: "desc" } },
      product: { select: { slug: true, name: true } },
      customer: { select: { id: true, _count: { select: { orders: true, leads: true } } } },
    },
  });
  if (!lead) notFound();
  const [team, emails, conversation] = await Promise.all([
    db.adminUser.findMany({ where: { active: true, role: { in: ["OWNER", "ADMIN", "SALES"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.emailLog.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" } }),
    db.aiConversation.findFirst({ where: { OR: [{ leadId: id }, ...(lead.sessionId ? [{ sessionId: lead.sessionId, kind: "assistant" }] : [])] }, orderBy: { updatedAt: "desc" } }),
  ]);

  const req = (lead.requirements ?? {}) as Record<string, unknown>;
  const reqRows = Object.keys(REQ_LABEL)
    .map((k) => [REQ_LABEL[k], show(req[k])] as const)
    .filter(([, v]) => v);
  // Images the customer attached in the chat (paths from our own /api/upload only).
  const attachments = (Array.isArray(req.attachments) ? req.attachments : []).filter((a): a is string => typeof a === "string" && /^\/uploads\/[a-z0-9]{10,40}$/.test(a));
  const design = (lead.design ?? null) as { preview?: unknown; crest?: unknown; pattern?: unknown; colours?: unknown; sampleName?: unknown; sampleNumber?: unknown; sponsor?: unknown } | null;
  const transcript = (Array.isArray(conversation?.messages) ? (conversation!.messages as Msg[]) : []).filter((m) => m && typeof m.content === "string");
  const phoneDigits = lead.phone?.replace(/[^\d]/g, "");

  const timeline = [
    ...lead.notes.map((n) => ({ at: n.createdAt, kind: "note", title: n.body, body: null as string | null, by: n.authorEmail })),
    ...emails.map((m) => ({
      at: m.createdAt,
      kind: "email",
      title: `Email ${m.status === "sent" ? "sent" : m.status === "skipped" ? "logged (sending not configured)" : "failed"}: ${m.subject}`,
      body: `To ${m.toAddress}${m.providerId ? ` · message id ${m.providerId}` : ""}`,
      by: null as string | null,
    })),
    { at: lead.createdAt, kind: "created", title: `Enquiry received via ${humanise(lead.source)}`, body: null, by: null },
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <Link href="/admin/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All leads
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-medium sm:text-3xl">{lead.leadNumber}</h1>
        <Badge tone={LEAD_TONE[lead.status]}>{humanise(lead.status)}</Badge>
        <Badge>{humanise(lead.source)}</Badge>
        {lead.isDemo && <Badge>demo</Badge>}
        <span className="text-sm text-subtle">{lead.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {lead.aiSummary && (
            <Card title="AI brief for sales">
              <p className="flex gap-2.5 text-[15px] leading-relaxed">
                <Sparkles className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>{lead.aiSummary}</span>
              </p>
              <p className="mt-2 text-xs text-subtle">Generated from the customer&apos;s own words. Check against the request below before quoting.</p>
            </Card>
          )}

          <Card title="Request">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-subtle">Product</dt>
                <dd className="font-medium">
                  {lead.product ? (
                    <Link href={`/products/${lead.product.slug}`} target="_blank" className="hover:text-accent">{lead.product.name}</Link>
                  ) : (
                    lead.productName ?? lead.category ?? "General enquiry"
                  )}
                </dd>
              </div>
              <div><dt className="text-subtle">Quantity</dt><dd className="font-medium tabular-nums">{lead.quantity?.toLocaleString() ?? "Not given"}</dd></div>
              <div><dt className="text-subtle">Budget</dt><dd className="font-medium">{lead.budget ?? "Not given"}</dd></div>
              <div><dt className="text-subtle">Needed by</dt><dd className="font-medium">{lead.targetDate ?? "Not given"}</dd></div>
              {reqRows.map(([k, v]) => (
                <div key={k} className={k === "Notes" || k === "Size breakdown" ? "sm:col-span-2" : undefined}>
                  <dt className="text-subtle">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {lead.message && (
              <blockquote className="mt-5 whitespace-pre-wrap rounded-xl bg-white/[0.03] p-4 text-[15px] leading-relaxed">{lead.message}</blockquote>
            )}
          </Card>

          {attachments.length > 0 && (
            <Card title={`Attached images (${attachments.length})`}>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {attachments.map((src) => (
                  <li key={src}>
                    <a href={src} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10 hover:ring-accent">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="Customer attachment" className="aspect-square w-full object-contain" loading="lazy" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-subtle">Uploaded by the customer in the website chat. Open to download the full file.</p>
            </Card>
          )}

          {design && (
            <Card title="Design Studio artwork">
              {typeof design.preview === "string" && design.preview.startsWith("data:image/") && (
                // A data URL snapshot from the customer's browser; next/image can't optimise it.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={design.preview} alt="Front and back of the customer's kit design" className="w-full rounded-xl bg-ink" />
              )}
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                {(
                  [
                    ["pattern", "Pattern"],
                    ["sampleName", "Sample name"],
                    ["sampleNumber", "Sample number"],
                    ["sponsor", "Sponsor"],
                  ] as const
                ).map(([k, title]) =>
                  show(design[k]) ? (
                    <div key={k}>
                      <dt className="text-subtle">{title}</dt>
                      <dd className="font-medium">{show(design[k])}</dd>
                    </div>
                  ) : null,
                )}
                {typeof design.crest === "string" && design.crest.startsWith("data:image/") && (
                  <div>
                    <dt className="text-subtle">Crest / logo</dt>
                    <dd className="mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={design.crest} alt="Customer's uploaded crest" className="h-16 w-16 rounded-lg bg-white/5 object-contain p-1" />
                    </dd>
                  </div>
                )}
                {design.colours != null && typeof design.colours === "object" && (
                  <div className="sm:col-span-3">
                    <dt className="text-subtle">Colours</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {Object.entries(design.colours as Record<string, string>).map(([k, hex]) => (
                        <span key={k} className="inline-flex items-center gap-1.5 rounded-full border hairline px-2 py-1 text-xs">
                          <span className="h-3.5 w-3.5 rounded-full ring-1 ring-white/20" style={{ background: /^#[0-9a-f]{3,8}$/i.test(hex) ? hex : undefined }} aria-hidden />
                          {k} <span className="font-mono text-subtle">{hex}</span>
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          {transcript.length > 0 && (
            <Card title="AI assistant conversation" action={<span className="text-xs text-subtle">{conversation!.engine}</span>}>
              <ol className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {transcript.map((m, i) => (
                  <li key={i} className={m.role === "user" ? "ml-8 rounded-xl bg-white/[0.06] p-3 text-sm" : "mr-8 flex gap-2 rounded-xl bg-accent/[0.06] p-3 text-sm"}>
                    {m.role !== "user" && <Bot className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />}
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <Card title="Activity & communications">
            <LeadNoteForm leadId={lead.id} />
            <ol className="mt-5 space-y-4">
              {timeline.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.kind === "email" ? "bg-sky-400" : e.kind === "note" ? "bg-white/40" : "bg-accent"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap break-words text-sm font-medium">{e.title}</p>
                    {e.body && <p className="mt-0.5 break-words text-sm text-muted">{e.body}</p>}
                    <p className="mt-0.5 text-xs text-subtle">
                      {e.at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                      {e.by ? ` · ${e.by}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Pipeline">
            <LeadControls leadId={lead.id} status={lead.status} assignedToId={lead.assignedToId} team={team} />
          </Card>
          <Card title="Reply by email">
            <EmailComposer
              to={lead.email}
              defaultSubject={`Your quote request ${lead.leadNumber}`}
              send={emailLead.bind(null, lead.id)}
              templates={[
                { label: "Quote", body: `Thank you for your request${lead.productName ? ` for ${lead.productName}` : ""}.\n\nOur quotation:\n- Unit price: [price] per piece for ${lead.quantity ?? "[qty]"} pieces\n- Sample: [price], ready in [days] days\n- Production lead time: [days] days after sample approval\n- Payment terms: [terms]\n- Freight: [method / estimate]\n\nThis quote is valid for 30 days. Reply to this email to approve or ask for changes.` },
                { label: "Need details", body: "To prepare an accurate quote, could you reply with:\n- your logo / artwork (vector file if possible)\n- the size breakdown\n- the colours you need\n- your target delivery date and country" },
                { label: "Follow up", body: "Just following up on the quote we sent. Do you have any questions, or would you like us to make a sample first?" },
              ]}
            />
          </Card>
          <Card title="Contact">
            <p className="font-semibold">{lead.name}</p>
            {lead.company && <p className="text-sm text-muted">{lead.company}</p>}
            <p className="text-sm text-subtle">
              {lead.country ? countryLabel(lead.country) : "Country not given"} · prefers {lead.preferredChannel}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`Your quote request ${lead.leadNumber}`)}`} className="inline-flex items-center gap-2 text-accent hover:underline">
                  <Mail className="h-4 w-4" aria-hidden /> {lead.email}
                </a>
              </li>
              {lead.phone && (
                <li>
                  <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-2 text-muted hover:text-fg">
                    <Phone className="h-4 w-4" aria-hidden /> {lead.phone}
                  </a>
                </li>
              )}
              {phoneDigits && (
                <li>
                  <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-muted hover:text-fg">
                    <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                  </a>
                </li>
              )}
            </ul>
            <p className="mt-3 rounded-lg bg-white/[0.03] p-2.5 text-xs leading-relaxed text-subtle">Confirm prices, approvals and delivery terms by email, even after a call or WhatsApp chat — it&apos;s your proof if a payment is disputed.</p>
            {lead.customer && (
              <Link href={`/admin/customers/${lead.customer.id}`} className="mt-3 inline-block text-xs font-semibold text-accent hover:underline">
                Customer history · {lead.customer._count.orders} orders, {lead.customer._count.leads} enquiries →
              </Link>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
