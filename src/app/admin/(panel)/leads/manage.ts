"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { newLeadNumber } from "@/lib/refs";
import { MANUAL_ORIGINS } from "@/lib/admin/lead-sources";

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageLeads");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const contactSchema = z
  .object({
    name: z.string().trim().min(2, "Add a name (person or business).").max(120),
    email: z.string().trim().toLowerCase().max(120).optional().transform((v) => (v ? v : null)).refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "That email doesn't look right."),
    phone: opt(30),
    company: opt(120),
    country: opt(60),
    city: opt(80),
    website: opt(200).refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Website must start with http:// or https://"),
  })
  .refine((d) => d.email || d.phone || d.website, { message: "Add at least an email, a phone/WhatsApp number or a website — otherwise nobody can contact them." });

const manualSchema = z.object({
  contact: contactSchema,
  origin: z.enum(MANUAL_ORIGINS),
  productName: opt(120),
  quantity: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
  message: opt(4000),
  preferredChannel: z.enum(["email", "whatsapp", "phone"]).default("whatsapp"),
});

/** A lead the team adds by hand: a WhatsApp chat, a call, a trade-show card, a referral. */
export async function createManualLead(input: z.input<typeof manualSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to add leads." };
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  const d = parsed.data;
  const c = d.contact;
  const customer = c.email
    ? await db.customer.upsert({
        where: { email: c.email },
        update: { phone: c.phone ?? undefined, company: c.company ?? undefined, country: c.country ?? undefined },
        create: { email: c.email, name: c.name, phone: c.phone, company: c.company, country: c.country, source: "MANUAL" },
        select: { id: true },
      })
    : null;
  let id: string | null = null;
  for (let attempt = 0; attempt < 4 && !id; attempt++) {
    try {
      id = (
        await db.lead.create({
          data: {
            leadNumber: newLeadNumber(),
            source: "MANUAL",
            customerId: customer?.id ?? null,
            name: c.name,
            email: c.email,
            phone: c.phone,
            company: c.company,
            country: c.country,
            city: c.city,
            website: c.website,
            preferredChannel: d.preferredChannel,
            productName: d.productName,
            quantity: d.quantity ?? null,
            message: d.message,
            meta: { origin: d.origin, addedBy: admin.email },
            assignedToId: admin.id,
          },
          select: { id: true },
        })
      ).id;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  await audit(admin, "lead.create_manual", "Lead", id, { origin: d.origin });
  revalidateTag("admin", { expire: 0 });
  revalidatePath("/admin/leads");
  return { ok: true, id: id!, message: "Lead added." };
}

/** Correct or complete a lead's contact details (e.g. a WhatsApp number given later). */
export async function updateLeadContact(leadId: string, input: z.input<typeof contactSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to change leads." };
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  const c = parsed.data;
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { customerId: true } });
  if (!lead) return { ok: false, error: "Lead not found." };
  let customerId = lead.customerId;
  if (!customerId && c.email) {
    customerId = (
      await db.customer.upsert({
        where: { email: c.email },
        update: {},
        create: { email: c.email, name: c.name, phone: c.phone, company: c.company, country: c.country, source: "MANUAL" },
        select: { id: true },
      })
    ).id;
  }
  await db.lead.update({ where: { id: leadId }, data: { ...c, customerId } });
  await db.leadNote.create({ data: { leadId, authorEmail: admin.email, body: "Contact details updated." } });
  await audit(admin, "lead.contact", "Lead", leadId);
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Contact details saved." };
}

/** Remove a lead completely (spam, duplicate, test). Orders already made from it are kept. */
export async function deleteLead(leadId: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to delete leads." };
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { leadNumber: true, name: true, email: true } });
  if (!lead) return { ok: false, error: "Lead not found." };
  await db.$transaction([
    db.emailLog.updateMany({ where: { leadId }, data: { leadId: null } }),
    db.aiConversation.updateMany({ where: { leadId }, data: { leadId: null } }),
    db.lead.delete({ where: { id: leadId } }),
  ]);
  await audit(admin, "lead.delete", "Lead", leadId, lead);
  revalidateTag("admin", { expire: 0 });
  revalidatePath("/admin/leads");
  return { ok: true, message: `Lead ${lead.leadNumber} deleted.` };
}
