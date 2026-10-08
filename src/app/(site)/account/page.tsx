import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Boxes, Camera, CheckCircle2, ClipboardList, Factory, Mail, MailWarning, MessageCircle, Palette, Plus, RotateCcw, Search, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { requireCustomerPage } from "@/lib/customer-auth";
import { orderToken } from "@/lib/refs";
import { getSettings, whatsappLink } from "@/lib/settings";
import { LEAD_LABEL, ORDER_LABEL, ORDER_STEPS, TONE_CLASS, orderStep } from "@/lib/portal";
import { formatMoney, cn } from "@/lib/utils";
import { PortalNav } from "./portal-nav";

export const metadata: Metadata = { title: "My account · Client portal" };
export const dynamic = "force-dynamic";

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [customer, { welcome }, settings] = await Promise.all([requireCustomerPage("/account"), searchParams, getSettings()]);

  // Nothing from before the email was proven is shown to an unverified account.
  const [orders, quotes] = customer.verified
    ? await Promise.all([
        db.order.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            orderNumber: true,
            status: true,
            totalCents: true,
            currency: true,
            createdAt: true,
            carrier: true,
            trackingNumber: true,
            items: { select: { nameSnapshot: true, quantity: true, imageSnapshot: true, isSample: true, product: { select: { slug: true } } } },
            _count: { select: { attachments: true } },
          },
        }),
        db.lead.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: { leadNumber: true, status: true, productName: true, category: true, quantity: true, createdAt: true, source: true, design: true },
        }),
      ])
    : [[], []];

  const firstName = customer.name.split(/\s+/)[0] ?? customer.name;
  const openQuotes = quotes.filter((q) => !["WON", "LOST"].includes(q.status)).length;
  const inProduction = orders.filter((o) => [1, 2].includes(orderStep(o.status))).length;
  const onTheWay = orders.filter((o) => o.status === "SHIPPED").length;
  const wa = whatsappLink(settings, `Hi Alrobel, this is ${customer.name}${customer.company ? ` from ${customer.company}` : ""}.`);

  return (
    <>
      <header className="on-dark relative -mt-[calc(var(--header-h)+12px)] overflow-hidden bg-ink pt-[calc(var(--header-h)+12px)] text-white">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-50" aria-hidden />
        <div className="pointer-events-none absolute -right-32 -top-20 h-[420px] w-[420px] rounded-full bg-accent/20 blur-[110px]" aria-hidden />
        <div className="container-x relative grid gap-8 pb-10 pt-10 lg:grid-cols-[1fr_auto] lg:items-end lg:pb-14 lg:pt-14">
          <div>
            <p className="label text-accent">Client portal{customer.company ? ` / ${customer.company}` : ""}</p>
            <h1 className="font-display mt-4 text-[clamp(2.2rem,6vw,3.8rem)] leading-[0.95]">Hi {firstName}.</h1>
            <p className="mt-3 max-w-xl text-white/60">Your orders, quotes and designs with Alrobel — all in one place.</p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/quote" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover">
                <Plus className="h-4 w-4" aria-hidden /> New quote request
              </Link>
              <Link href="/design-studio" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border border-white/20 px-5 text-sm font-semibold hover:bg-white/10">
                <Palette className="h-4 w-4" aria-hidden /> Design a kit
              </Link>
              <Link href="/products" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border border-white/20 px-5 text-sm font-semibold hover:bg-white/10">
                <Search className="h-4 w-4" aria-hidden /> Browse products
              </Link>
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/[0.04] p-5 backdrop-blur lg:w-80">
            <p className="label text-[0.6rem] text-white/45">Your Alrobel team</p>
            <p className="mt-2 text-sm text-white/70">Questions about an order or quote? Talk to the people making your kits.</p>
            <div className="mt-4 grid gap-2">
              {wa && (
                <a href={wa} target="_blank" rel="noopener" className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1fae4b] text-sm font-semibold text-white hover:bg-[#178f3d]">
                  <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp us
                </a>
              )}
              {settings.contact.email ? (
                <a href={`mailto:${settings.contact.email}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/15 text-sm font-semibold hover:bg-white/10">
                  <Mail className="h-4 w-4" aria-hidden /> Email us
                </a>
              ) : (
                <Link href="/contact" className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/15 text-sm font-semibold hover:bg-white/10">
                  <Mail className="h-4 w-4" aria-hidden /> Contact us
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container-x pb-28 pt-8 lg:pb-24">
        <PortalNav active="overview" />

        {welcome && customer.verified && (
          <p className="mt-6 flex items-center gap-2.5 rounded-[var(--radius-card)] bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200" role="status">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden /> Email verified — welcome to your portal.
          </p>
        )}

        {!customer.verified && (
          <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] bg-amber-50 p-5 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
              <div>
                <p className="font-semibold text-amber-900">Verify your email to see your quotes and orders</p>
                <p className="mt-0.5 text-sm text-amber-800">For your security, past orders under {customer.email} stay hidden until you confirm it&apos;s yours.</p>
              </div>
            </div>
            <Link href="/account/verify" className="inline-flex h-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-ink px-5 text-sm font-semibold text-white">
              Enter code
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              [ClipboardList, "Open quotes", openQuotes],
              [Factory, "In production", inProduction],
              [Truck, "On the way", onTheWay],
              [Boxes, "Total orders", orders.length],
            ] as const
          ).map(([Icon, label, value]) => (
            <div key={label} className="rounded-[var(--radius-card)] bg-surface p-4 ring-1 ring-black/[0.06] sm:p-5">
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <p className="mt-3 font-display text-3xl tabular-nums">{customer.verified ? value : "—"}</p>
              <p className="mt-0.5 text-sm text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-10 xl:grid-cols-[1.35fr_1fr]">
          {/* Orders */}
          <section aria-labelledby="orders-h">
            <div className="flex items-end justify-between gap-4">
              <h2 id="orders-h" className="font-display text-2xl">Orders</h2>
              <Link href="/track" className="text-sm font-medium text-accent hover:underline">
                Track by order number
              </Link>
            </div>
            {orders.length === 0 ? (
              <Empty
                icon={Boxes}
                title={customer.verified ? "No orders yet" : "Orders appear after verification"}
                body="When you order samples or bulk kits, you'll follow each one here — from cutting to your door, with QC photos before it ships."
                cta={{ href: "/products", label: "Browse products" }}
              />
            ) : (
              <ul className="mt-4 space-y-4">
                {orders.map((o) => {
                  const step = orderStep(o.status);
                  const href = `/order/${o.orderNumber}?t=${orderToken(o.orderNumber)}`;
                  const units = o.items.reduce((n, i) => n + i.quantity, 0);
                  const reorder = o.items.find((i) => i.product?.slug)?.product?.slug;
                  return (
                    <li key={o.orderNumber} className="overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-black/[0.06]">
                      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                        <div>
                          <p className="font-mono text-[15px] font-medium">{o.orderNumber}</p>
                          <p className="mt-0.5 text-sm text-muted">
                            {date(o.createdAt)} · {units} {units === 1 ? "piece" : "pieces"} · {formatMoney(o.totalCents, o.currency)}
                          </p>
                        </div>
                        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1", step < 0 ? TONE_CLASS.closed : step === 4 ? TONE_CLASS.won : TONE_CLASS.active)}>{ORDER_LABEL[o.status]}</span>
                      </div>
                      {step >= 0 && (
                        <ol className="grid grid-cols-5 gap-1.5 px-5" aria-label="Order progress">
                          {ORDER_STEPS.map((label, i) => (
                            <li key={label}>
                              <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-accent" : "bg-black/[0.08]")} />
                              <span className={cn("mt-1.5 hidden text-[11px] sm:block", i <= step ? "font-semibold text-fg" : "text-subtle")}>{label}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      <div className="mt-4 flex items-center gap-2 overflow-x-auto px-5">
                        {o.items.slice(0, 5).map((it, i) => (
                          <span key={i} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface-2 ring-1 ring-black/[0.06]" title={`${it.quantity} × ${it.nameSnapshot}`}>
                            {it.imageSnapshot && <Image src={it.imageSnapshot} alt={it.nameSnapshot} fill sizes="48px" className="object-cover" />}
                          </span>
                        ))}
                        <span className="ml-1 truncate text-sm text-muted">{o.items.map((i) => i.nameSnapshot).slice(0, 2).join(", ")}{o.items.length > 2 ? ` +${o.items.length - 2} more` : ""}</span>
                      </div>
                      {o.trackingNumber && (
                        <p className="mx-5 mt-4 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
                          <Truck className="h-4 w-4 text-accent" aria-hidden /> {o.carrier ?? "Tracking"}: <span className="font-mono">{o.trackingNumber}</span>
                        </p>
                      )}
                      <div className="mt-5 flex flex-wrap gap-2 border-t hairline bg-surface-2/50 px-5 py-3">
                        <Link href={href} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-ink px-3.5 text-sm font-semibold text-white">
                          View order <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                        {o._count.attachments > 0 && (
                          <Link href={`${href}#qc`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border hairline px-3.5 text-sm font-semibold hover:bg-surface">
                            <Camera className="h-3.5 w-3.5" aria-hidden /> QC photos ({o._count.attachments})
                          </Link>
                        )}
                        {reorder && (
                          <Link href={`/quote?product=${encodeURIComponent(reorder)}&qty=${units}`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border hairline px-3.5 text-sm font-semibold hover:bg-surface">
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reorder
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Quotes */}
          <section aria-labelledby="quotes-h">
            <div className="flex items-end justify-between gap-4">
              <h2 id="quotes-h" className="font-display text-2xl">Quotes &amp; designs</h2>
              <Link href="/quote" className="text-sm font-medium text-accent hover:underline">
                New request
              </Link>
            </div>
            {quotes.length === 0 ? (
              <Empty
                icon={ClipboardList}
                title={customer.verified ? "No quote requests yet" : "Quotes appear after verification"}
                body="Send us your brief — sport, quantity, sizes and logo — and get a written factory-direct quote. Kits you design in the Design Studio land here too."
                cta={{ href: "/quote", label: "Request a quote" }}
              />
            ) : (
              <ul className="mt-4 divide-y hairline overflow-hidden rounded-[var(--radius-card)] bg-surface ring-1 ring-black/[0.06]">
                {quotes.map((q) => {
                  const s = LEAD_LABEL[q.status];
                  const preview = (q.design as { preview?: unknown } | null)?.preview;
                  return (
                    <li key={q.leadNumber}>
                      <Link href={`/account/quotes/${q.leadNumber}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2">
                        <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-ink">
                          {typeof preview === "string" && preview.startsWith("data:image/") ? (
                            // Design Studio snapshot (data URL) — next/image can't optimise it.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt="" className="h-full w-full object-contain" />
                          ) : (
                            <ClipboardList className="h-5 w-5 text-white/60" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{q.productName ?? q.category ?? (q.design ? "Custom kit design" : "Custom enquiry")}</span>
                          <span className="mt-0.5 block text-sm text-muted">
                            <span className="font-mono">{q.leadNumber}</span> · {q.quantity ? `${q.quantity.toLocaleString()} pcs · ` : ""}
                            {date(q.createdAt)}
                          </span>
                        </span>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", TONE_CLASS[s.tone])}>{s.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Empty({ icon: Icon, title, body, cta }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string; cta: { href: string; label: string } }) {
  return (
    <div className="mt-4 rounded-[var(--radius-card)] border border-dashed border-black/15 bg-surface/60 p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-subtle" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      <Link href={cta.href} className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] bg-ink px-4 text-sm font-semibold text-white">
        {cta.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
