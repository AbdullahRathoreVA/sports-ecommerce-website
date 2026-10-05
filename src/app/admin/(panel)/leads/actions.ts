"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { emailFromTeam } from "@/lib/emails";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageLeads");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const schema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "NEGOTIATING", "WON", "LOST"]),
  assignedToId: z.string().max(40).nullable(),
});

export async function updateLead(leadId: string, input: z.input<typeof schema>): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to change leads." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { status: true, assignedToId: true } });
  if (!lead) return { ok: false, error: "Lead not found." };
  if (parsed.data.assignedToId) {
    const exists = await db.adminUser.findFirst({ where: { id: parsed.data.assignedToId, active: true }, select: { id: true } });
    if (!exists) return { ok: false, error: "That team member isn't active." };
  }
  await db.lead.update({ where: { id: leadId }, data: parsed.data });
  const notes: string[] = [];
  if (lead.status !== parsed.data.status) notes.push(`Status: ${lead.status} → ${parsed.data.status}`);
  if (lead.assignedToId !== parsed.data.assignedToId) notes.push("Assignment changed");
  if (notes.length) await db.leadNote.create({ data: { leadId, authorEmail: admin.email, body: notes.join(" · ") } });
  await audit(admin, "lead.update", "Lead", leadId, { from: lead, to: parsed.data });
  revalidatePath(`/admin/leads/${leadId}`);
  revalidatePath("/admin/leads");
  return { ok: true, message: "Lead updated." };
}

export async function addLeadNote(leadId: string, body: string): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const text = body.trim().slice(0, 4000);
  if (!text) return { ok: false, error: "Write a note first." };
  await db.leadNote.create({ data: { leadId, authorEmail: admin.email, body: text } });
  await audit(admin, "lead.note", "Lead", leadId);
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function emailLead(leadId: string, subject: string, body: string): Promise<ActionResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const s = subject.trim().slice(0, 200);
  const b = body.trim().slice(0, 10_000);
  if (!s || !b) return { ok: false, error: "Add a subject and a message." };
  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { id: true, email: true, name: true, leadNumber: true, status: true } });
  if (!lead) return { ok: false, error: "Lead not found." };
  const r = await emailFromTeam({ to: lead.email, name: lead.name, subject: s, body: b, reference: lead.leadNumber, sender: admin.name, leadId });
  if (lead.status === "NEW") await db.lead.update({ where: { id: leadId }, data: { status: "CONTACTED" } });
  await audit(admin, "lead.email", "Lead", leadId, { subject: s, status: r.status });
  revalidatePath(`/admin/leads/${leadId}`);
  if (r.status === "failed") return { ok: false, error: "The email provider rejected the message — it is logged as failed. Check the address and try again." };
  return { ok: true, message: r.status === "sent" ? "Email sent and saved to the record." : "Saved to the record. Sending starts once the company email domain is connected." };
}
