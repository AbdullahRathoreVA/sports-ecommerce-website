import "server-only";
import { db } from "@/lib/db";
import { newLeadNumber } from "@/lib/refs";
import { notifyTeam } from "@/lib/notify";
import { emailLeadReceived } from "@/lib/emails";
import { recordServerEvent } from "@/lib/analytics/server";
import { summariseEnquiry } from "@/lib/ai/assistant";
import { revalidateTag } from "next/cache";
import type { LeadInput } from "@/lib/validation";

const SOURCE_TO_CUSTOMER = {
  QUOTE_FORM: "QUOTE",
  PRODUCT_PAGE: "QUOTE",
  CONTACT_FORM: "CONTACT",
  AI_ASSISTANT: "AI_ASSISTANT",
  DESIGN_STUDIO: "DESIGN_STUDIO",
  PRODUCT_FINDER: "QUOTE",
} as const;

const SOURCE_EVENT = {
  QUOTE_FORM: "quote_submit",
  PRODUCT_PAGE: "quote_submit",
  DESIGN_STUDIO: "quote_submit",
  PRODUCT_FINDER: "quote_submit",
  CONTACT_FORM: "contact_submit",
  AI_ASSISTANT: "ai_lead_created",
} as const;

/**
 * Persist an enquiry as a lead (and its customer), then notify. Saved first,
 * notified second: an email outage must never lose a lead.
 */
export async function createLead(input: LeadInput) {
  const product = input.productSlug
    ? await db.product.findUnique({ where: { slug: input.productSlug }, select: { id: true, name: true, category: { select: { slug: true } } } })
    : null;

  const customer = await db.customer.upsert({
    where: { email: input.email },
    update: {
      // Fill gaps, never overwrite what the team may have corrected.
      phone: input.phone ?? undefined,
      company: input.company ?? undefined,
      country: input.country ?? undefined,
    },
    create: {
      email: input.email,
      name: input.name,
      phone: input.phone,
      company: input.company,
      country: input.country,
      source: SOURCE_TO_CUSTOMER[input.source],
    },
  });

  const requirements = Object.fromEntries(Object.entries(input.requirements ?? {}).filter(([, v]) => v));
  const aiSummary = await summariseEnquiry({
    name: input.name,
    company: input.company,
    country: input.country,
    productName: product?.name ?? input.productName,
    quantity: input.quantity,
    message: input.message,
    requirements,
    transcript: input.transcript,
  }).catch(() => null);

  let lead = null;
  for (let attempt = 0; attempt < 4 && !lead; attempt++) {
    try {
      lead = await db.lead.create({
        data: {
          leadNumber: newLeadNumber(),
          source: input.source,
          customerId: customer.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company,
          country: input.country,
          preferredChannel: input.preferredChannel,
          productId: product?.id ?? null,
          productName: product?.name ?? input.productName,
          category: product?.category.slug ?? input.category,
          quantity: input.quantity,
          // Visitor-uploaded images (logo/artwork from the chat) ride along with the requirements.
          requirements: {
            ...requirements,
            ...(input.attachments?.length ? { attachments: input.attachments } : {}),
            ...(input.roster?.length ? { roster: input.roster } : {}),
          },
          budget: input.budget,
          targetDate: input.targetDate,
          message: [input.message, input.transcript?.length ? `\n— Assistant conversation —\n${input.transcript.map((t) => `${t.role === "user" ? "Customer" : "Assistant"}: ${t.content}`).join("\n")}` : ""]
            .filter(Boolean)
            .join("\n")
            .slice(0, 12_000),
          design: input.design ? JSON.parse(JSON.stringify(input.design)) : undefined,
          aiSummary,
          sessionId: input.sessionId,
        },
      });
    } catch (error) {
      // Unique collision on the random reference: retry with a new one.
      if (attempt === 3) throw error;
    }
  }
  if (!lead) throw new Error("Could not create lead");

  revalidateTag("admin", { expire: 0 });
  await recordServerEvent(input.sessionId, SOURCE_EVENT[input.source], {
    path: input.source === "CONTACT_FORM" ? "/contact" : "/quote",
    productId: product?.id,
    label: lead.leadNumber,
    value: input.quantity,
  });

  void notifyTeam(
    `New ${input.source === "CONTACT_FORM" ? "message" : "quote request"} ${lead.leadNumber} — ${input.company ?? input.name}`,
    [
      `Reference: ${lead.leadNumber}`,
      `From: ${input.name} <${input.email}>${input.phone ? ` · ${input.phone}` : ""}`,
      input.company ? `Company: ${input.company}` : "",
      input.country ? `Country: ${input.country}` : "",
      product ? `Product: ${product.name}` : input.productName ? `Product: ${input.productName}` : "",
      input.quantity ? `Quantity: ${input.quantity}` : "",
      aiSummary ? `\nSummary: ${aiSummary}` : "",
      input.message ? `\nMessage:\n${input.message}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { leadId: lead.id },
  );
  // Written acknowledgement to the customer: starts the email record of the enquiry.
  void emailLeadReceived({ id: lead.id, leadNumber: lead.leadNumber, name: input.name, email: input.email, productName: product?.name ?? input.productName, quantity: input.quantity });

  return lead;
}
