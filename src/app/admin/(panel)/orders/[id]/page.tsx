import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge, Card, ORDER_TONE, PAYMENT_TONE, humanise } from "@/components/admin/ui";
import { NoteForm, OrderControls, OrderPhotos } from "./controls";
import { emailOrderCustomer } from "../actions";
import { EmailComposer } from "@/components/admin/email-composer";
import { formatMoney } from "@/lib/utils";
import { orderToken } from "@/lib/refs";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("manageOrders");
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "desc" } },
      attachments: { orderBy: { createdAt: "desc" } },
      emails: { orderBy: { createdAt: "desc" } },
      customer: { select: { id: true, _count: { select: { orders: true, leads: true } } } },
    },
  });
  if (!order) notFound();

  const timeline = [
    ...order.events.map((e) => ({
      at: e.createdAt,
      kind: e.kind,
      title:
        e.kind === "created" ? "Order placed" : e.kind === "note" ? "Note" : `${humanise(e.kind)}: ${e.fromValue ? `${humanise(e.fromValue)} → ` : ""}${humanise(e.toValue ?? "")}`,
      body: e.note,
      by: e.actorEmail,
    })),
    ...order.emails.map((m) => ({
      at: m.createdAt,
      kind: "email",
      title: `Email ${m.status === "sent" ? "sent" : m.status === "skipped" ? "logged (sending not configured)" : "failed"}: ${m.subject}`,
      body: `To ${m.toAddress}${m.providerId ? ` · message id ${m.providerId}` : ""}${m.error ? ` · ${m.error}` : ""}`,
      by: null as string | null,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const phoneDigits = order.contactPhone?.replace(/[^\d]/g, "");

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All orders
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-medium sm:text-3xl">{order.orderNumber}</h1>
        <Badge tone={ORDER_TONE[order.status]}>{humanise(order.status)}</Badge>
        <Badge tone={PAYMENT_TONE[order.paymentStatus]}>{humanise(order.paymentStatus)}</Badge>
        <Badge>{humanise(order.shippingStatus)}</Badge>
        {order.isDemo && <Badge>demo</Badge>}
        <span className="text-sm text-subtle">{order.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Items">
            <ul className="divide-y hairline">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {i.imageSnapshot && <Image src={i.imageSnapshot} alt="" fill sizes="56px" className="object-cover" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.nameSnapshot}</p>
                    <p className="text-sm text-muted">
                      <span className="font-mono text-xs">{i.skuSnapshot}</span> · {i.isSample ? "Sample" : "Bulk"}
                      {i.size ? ` · ${i.size}` : ""}
                    </p>
                    <p className="text-sm text-subtle">
                      {i.quantity} × {formatMoney(i.unitCents, order.currency)}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatMoney(i.totalCents, order.currency)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t hairline pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(order.subtotalCents, order.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Freight</dt><dd className="text-subtle">Quoted separately</dd></div>
              <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.totalCents, order.currency)}</dd></div>
            </dl>
          </Card>

          <Card title="QC & packing photos" action={<span className="text-xs text-subtle">Proof of condition at dispatch</span>}>
            <OrderPhotos
              orderId={order.id}
              photos={order.attachments.map((a) => ({ id: a.id, url: `/uploads/${a.mediaId}`, kind: a.kind, caption: a.caption, uploadedBy: a.uploadedBy, createdAt: a.createdAt.toISOString() }))}
            />
          </Card>

          <Card title="Timeline & communications">
            <NoteForm orderId={order.id} />
            <ol className="mt-5 space-y-4">
              {timeline.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${e.kind === "email" ? "bg-sky-400" : e.kind === "note" ? "bg-white/40" : "bg-accent"}`} aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{e.title}</p>
                    {e.body && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted">{e.body}</p>}
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
          <Card title="Update order">
            <OrderControls
              orderId={order.id}
              initial={{
                status: order.status,
                paymentStatus: order.paymentStatus,
                shippingStatus: order.shippingStatus,
                carrier: order.carrier ?? "",
                trackingNumber: order.trackingNumber ?? "",
                internalNotes: order.internalNotes ?? "",
              }}
            />
          </Card>
          <Card title="Email the customer">
            <EmailComposer
              to={order.contactEmail}
              defaultSubject={`Your order ${order.orderNumber}`}
              send={emailOrderCustomer.bind(null, order.id)}
              templates={[
                { label: "Proforma & payment", body: `Please find your proforma invoice for order ${order.orderNumber} below.

Total: ${formatMoney(order.totalCents, order.currency)} plus freight of [amount].
Payment: [bank details / payment link].

Production starts once payment is received. Please reply to confirm the sizes, colours and artwork are correct.` },
                { label: "Approve sample", body: "Your pre-production sample is ready — photos are on your order page (link below). Please reply \"APPROVED\" to this email to start bulk production, or tell us what to change." },
                { label: "QC passed", body: "Your order has passed our final quality check. We've photographed the goods and packing before dispatch, and the photos are on your order page." },
              ]}
            />
          </Card>
          <Card title="Customer">
            <p className="font-semibold">{order.contactName}</p>
            {order.company && <p className="text-sm text-muted">{order.company}</p>}
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href={`mailto:${order.contactEmail}?subject=${encodeURIComponent(`Your order ${order.orderNumber}`)}`} className="inline-flex items-center gap-2 text-accent hover:underline">
                  <Mail className="h-4 w-4" aria-hidden /> {order.contactEmail}
                </a>
              </li>
              {order.contactPhone && (
                <>
                  <li>
                    <a href={`tel:${order.contactPhone}`} className="inline-flex items-center gap-2 text-muted hover:text-fg">
                      <Phone className="h-4 w-4" aria-hidden /> {order.contactPhone}
                    </a>
                  </li>
                  {phoneDigits && (
                    <li>
                      <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-muted hover:text-fg">
                        <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
                      </a>
                    </li>
                  )}
                </>
              )}
            </ul>
            {order.customer && (
              <Link href={`/admin/customers/${order.customer.id}`} className="mt-3 inline-block text-xs font-semibold text-accent hover:underline">
                Customer history · {order.customer._count.orders} orders, {order.customer._count.leads} enquiries →
              </Link>
            )}
          </Card>
          <Card title="Delivery address">
            <p className="text-sm leading-relaxed text-muted">
              {order.shipLine1}
              {order.shipLine2 && <><br />{order.shipLine2}</>}
              <br />
              {order.shipCity}
              {order.shipRegion ? `, ${order.shipRegion}` : ""} {order.shipPostal ?? ""}
              <br />
              {order.shipCountry}
            </p>
            {order.customerNote && <p className="mt-3 rounded-lg bg-white/[0.03] p-3 text-sm">“{order.customerNote}”</p>}
          </Card>
          <Card title="Agreement record">
            <p className="flex items-start gap-2 text-sm text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              {order.termsAcceptedAt
                ? `Terms of sale (version ${order.termsVersion}) accepted at checkout on ${order.termsAcceptedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.`
                : "No terms acceptance recorded for this order."}
            </p>
            <p className="mt-2 text-xs text-subtle">Payment method: {order.paymentMethod.replace(/_/g, " ")}</p>
            <a href={`/order/${order.orderNumber}?t=${orderToken(order.orderNumber)}`} target="_blank" rel="noopener" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
              Customer&apos;s order page →
            </a>
          </Card>
        </div>
      </div>
    </>
  );
}
