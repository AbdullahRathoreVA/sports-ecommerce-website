import "server-only";
import { db } from "@/lib/db";
import { normaliseTiers, priceLine } from "@/lib/pricing";
import { newOrderNumber, orderToken } from "@/lib/refs";
import { notifyTeam } from "@/lib/notify";
import { emailOrderReceived } from "@/lib/emails";
import { recordServerEvent } from "@/lib/analytics/server";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/utils";
import type { OrderInput } from "@/lib/validation";

/** Bump when the terms page changes, so every order records which version was accepted. */
export const TERMS_VERSION = "2026-10";

export class OrderError extends Error {
  constructor(
    public code: "INVALID_LINE" | "PRICE_CHANGED" | "PAYMENT_METHOD",
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

/**
 * Create an order with AUTHORITATIVE pricing.
 *
 * The cart only sends product ids, sizes and quantities. Every line is
 * re-read from the database (must be ACTIVE and buyable) and re-priced with
 * the same pure functions the browser used. If the server total differs from
 * what the buyer saw, nothing is written and a 409 asks them to re-confirm —
 * a buyer is never charged a number they did not see.
 */
export async function createOrder(input: OrderInput) {
  const settings = await getSettings();
  const method = settings.commerce.paymentMethods.find((m) => m.id === input.paymentMethod);
  if (!method) throw new OrderError("PAYMENT_METHOD", "Choose a payment method.");

  const ids = [...new Set(input.lines.map((l) => l.productId))];
  const products = await db.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE", purchaseMode: { in: ["CART", "BOTH"] } },
    include: { images: { orderBy: { position: "asc" }, take: 1 } },
  });

  const priced = input.lines.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    if (!product) throw new OrderError("INVALID_LINE", "An item in your cart is no longer available.", { productId: line.productId });
    const tiers = normaliseTiers(product.priceTiers);
    if (!line.isSample && line.quantity < product.moq) {
      throw new OrderError("INVALID_LINE", `${product.name} needs at least ${product.moq} units for a bulk order.`, { productId: product.id });
    }
    if (line.size && product.sizes.length && !product.sizes.includes(line.size)) {
      throw new OrderError("INVALID_LINE", `Size ${line.size} isn't available for ${product.name}.`, { productId: product.id });
    }
    const price = priceLine({ quantity: line.quantity, tiers, samplePriceCents: product.samplePriceCents, isSample: line.isSample });
    if (!price) throw new OrderError("INVALID_LINE", `${product.name} can't be ordered in that quantity.`, { productId: product.id });
    return { product, line, ...price };
  });

  const subtotal = priced.reduce((sum, p) => sum + p.totalCents, 0);
  if (subtotal !== input.expectedTotalCents) {
    throw new OrderError("PRICE_CHANGED", "Prices were updated since you added these items. Please review the new total.", {
      totalCents: subtotal,
      lines: priced.map((p) => ({ productId: p.product.id, unitCents: p.unitCents, totalCents: p.totalCents })),
    });
  }

  const customer = await db.customer.upsert({
    where: { email: input.contact.email },
    update: { phone: input.contact.phone ?? undefined, company: input.contact.company ?? undefined, country: input.shipping.country },
    create: {
      email: input.contact.email,
      name: input.contact.name,
      phone: input.contact.phone,
      company: input.contact.company,
      country: input.shipping.country,
      source: "ORDER",
    },
  });

  let order = null;
  for (let attempt = 0; attempt < 4 && !order; attempt++) {
    try {
      order = await db.order.create({
        data: {
          orderNumber: newOrderNumber(),
          customerId: customer.id,
          paymentMethod: method.id,
          subtotalCents: subtotal,
          totalCents: subtotal,
          currency: settings.commerce.currency,
          contactName: input.contact.name,
          contactEmail: input.contact.email,
          contactPhone: input.contact.phone,
          company: input.contact.company,
          shipLine1: input.shipping.line1,
          shipLine2: input.shipping.line2,
          shipCity: input.shipping.city,
          shipRegion: input.shipping.region,
          shipPostal: input.shipping.postal,
          shipCountry: input.shipping.country,
          customerNote: input.note,
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
          sessionId: input.sessionId,
          items: {
            create: priced.map((p) => ({
              productId: p.product.id,
              nameSnapshot: p.product.name,
              skuSnapshot: p.product.sku,
              imageSnapshot: p.product.images[0]?.url ?? null,
              size: p.line.size ?? null,
              isSample: p.line.isSample,
              quantity: p.line.quantity,
              unitCents: p.unitCents,
              totalCents: p.totalCents,
            })),
          },
          events: {
            create: [{ kind: "created", toValue: "PENDING", note: `Order placed on the website; terms of sale ${TERMS_VERSION} accepted at checkout` }],
          },
        },
        include: { items: true },
      });
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  if (!order) throw new Error("Could not create order");

  await recordServerEvent(input.sessionId, "purchase", {
    path: "/checkout",
    productId: priced[0]?.product.id,
    label: order.orderNumber,
    value: order.totalCents,
  });

  const token = orderToken(order.orderNumber);
  const lines = order.items.map((i) => `- ${i.quantity} × ${i.nameSnapshot}${i.size ? ` (${i.size})` : ""}${i.isSample ? " [sample]" : ""} — ${formatMoney(i.totalCents, order.currency)}`);
  // Logged to EmailLog either way — the written record of the order.
  await emailOrderReceived(order);
  void notifyTeam(
    `New order ${order.orderNumber} — ${formatMoney(order.totalCents, order.currency)}`,
    [`${order.contactName} <${order.contactEmail}>`, order.company ?? "", `Ship to: ${order.shipCity}, ${order.shipCountry}`, "", ...lines].filter(Boolean).join("\n"),
    { orderId: order.id },
  );

  return { orderNumber: order.orderNumber, token, totalCents: order.totalCents };
}
