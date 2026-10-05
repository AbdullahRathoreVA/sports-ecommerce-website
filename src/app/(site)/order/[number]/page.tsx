import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { verifyOrderToken } from "@/lib/refs";
import { getSettings, whatsappLink } from "@/lib/settings";
import { formatMoney, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const FLOW = ["PENDING", "CONFIRMED", "PROCESSING", "MANUFACTURING", "SHIPPED", "DELIVERED"] as const;
const LABEL: Record<string, string> = {
  PENDING: "Received",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  MANUFACTURING: "In production",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string; new?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const [{ number }, { t, new: isNew }] = await Promise.all([params, searchParams]);
  const orderNumber = decodeURIComponent(number).toUpperCase();
  // Without a valid signed token the page behaves as if the order didn't exist.
  if (!verifyOrderToken(orderNumber, t)) notFound();

  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { orderNumber }, include: { items: true, attachments: { orderBy: { createdAt: "asc" } } } }),
    getSettings(),
  ]);
  if (!order) notFound();
  const method = settings.commerce.paymentMethods.find((m) => m.id === order.paymentMethod);
  const step = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const wa = whatsappLink(settings, `Hi, about my order ${order.orderNumber}`);
  const mail = settings.contact.email ? `mailto:${settings.contact.email}?subject=${encodeURIComponent(`Order ${order.orderNumber}`)}` : null;
  const PHOTO_LABEL: Record<string, string> = { qc: "Quality check", packing: "Packing", dispatch: "Dispatch", document: "Document" };

  return (
    <div className="container-x max-w-4xl pb-28 pt-10 lg:pb-24 lg:pt-14">
      {isNew && (
        <div className="mb-8 flex gap-3 rounded-[var(--radius-card)] bg-emerald-500/10 p-5 text-emerald-200 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" aria-hidden />
          <div>
            <p className="font-semibold">Thank you — your order is in.</p>
            <p className="mt-1 text-sm">We&apos;ve emailed a confirmation to {order.contactEmail}. Bookmark this page to check progress any time.</p>
          </div>
        </div>
      )}
      <p className="eyebrow text-accent">Order</p>
      <h1 className="mt-2 font-mono text-3xl font-medium sm:text-4xl">{order.orderNumber}</h1>
      <p className="mt-2 text-muted">Placed {order.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

      {order.status === "CANCELLED" || order.status === "REFUNDED" ? (
        <p className="mt-8 rounded-xl bg-surface-2 p-4 font-semibold">{LABEL[order.status]}</p>
      ) : (
        <ol className="mt-8 grid grid-cols-3 gap-y-5 sm:grid-cols-6" aria-label="Order progress">
          {FLOW.map((s, i) => (
            <li key={s} className="flex flex-col items-center text-center">
              {i <= step ? <CheckCircle2 className="h-6 w-6 text-accent" aria-hidden /> : <Circle className="h-6 w-6 text-subtle" aria-hidden />}
              <span className={cn("mt-2 text-xs font-medium", i <= step ? "text-fg" : "text-subtle")}>{LABEL[s]}</span>
              {i === step && <span className="sr-only">(current)</span>}
            </li>
          ))}
        </ol>
      )}
      {order.trackingNumber && (
        <p className="mt-6 rounded-xl bg-chalk p-4 text-sm">
          Shipped with <strong>{order.carrier}</strong> — tracking number <span className="font-mono">{order.trackingNumber}</span>
        </p>
      )}

      {order.attachments.length > 0 && (
        <section className="mt-10" aria-labelledby="photos-h">
          <h2 id="photos-h" className="text-lg font-semibold">Photos from the factory</h2>
          <p className="mt-1 text-sm text-muted">Taken by our team during quality control and packing, before your goods left the factory.</p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {order.attachments.map((a) => (
              <li key={a.id}>
                <a href={`/uploads/${a.mediaId}`} target="_blank" rel="noopener" className="relative block aspect-square overflow-hidden rounded-xl bg-surface-2">
                  <Image src={`/uploads/${a.mediaId}`} alt={`${PHOTO_LABEL[a.kind] ?? "Order"} photo`} fill sizes="(min-width: 640px) 25vw, 50vw" className="object-cover" />
                </a>
                <p className="mt-1.5 text-xs text-subtle">
                  {PHOTO_LABEL[a.kind] ?? a.kind} · {a.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 grid gap-8 md:grid-cols-[1fr_300px]">
        <ul className="divide-y hairline rounded-[var(--radius-card)] border hairline bg-surface">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 p-4">
              <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                {i.imageSnapshot && <Image src={i.imageSnapshot} alt="" fill sizes="64px" className="object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.nameSnapshot}</p>
                <p className="text-sm text-muted">
                  {i.isSample ? "Sample" : `${i.quantity} × ${formatMoney(i.unitCents, order.currency)}`}
                  {i.size ? ` · ${i.size}` : ""}
                </p>
              </div>
              <p className="font-semibold">{formatMoney(i.totalCents, order.currency)}</p>
            </li>
          ))}
          <li className="flex justify-between p-4 text-[15px]">
            <span className="font-semibold">Subtotal</span>
            <span className="font-semibold">{formatMoney(order.totalCents, order.currency)}</span>
          </li>
        </ul>
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-card)] bg-chalk p-5 text-sm">
            <p className="font-semibold">Payment</p>
            <p className="mt-1 text-muted">{method?.label ?? order.paymentMethod}</p>
            <p className="mt-1 text-muted">{method?.detail}</p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-chalk p-5 text-sm">
            <p className="font-semibold">Delivery</p>
            <p className="mt-1 text-muted">
              {order.contactName}
              <br />
              {order.shipLine1}
              {order.shipLine2 ? <>, {order.shipLine2}</> : null}
              <br />
              {order.shipCity}
              {order.shipPostal ? ` ${order.shipPostal}` : ""}, {order.shipCountry}
            </p>
          </div>
          {mail && (
            <a href={mail} className="flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-white font-semibold text-ink" data-track="email_click" data-track-label="Order page">
              Questions? Email us
            </a>
          )}
          {wa && (
            <a href={wa} className="flex h-12 items-center justify-center rounded-[var(--radius-control)] border hairline font-semibold" data-track="whatsapp_click" data-track-label="Order page">
              WhatsApp us
            </a>
          )}
          {!mail && !wa && (
            <Link href="/contact" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] border hairline font-semibold">
              Questions? Contact us
            </Link>
          )}
          <p className="text-xs leading-relaxed text-subtle">For changes, approvals or any problem with your goods, please email us and quote {order.orderNumber} so there&apos;s a written record for both of us.</p>
        </aside>
      </div>
    </div>
  );
}
