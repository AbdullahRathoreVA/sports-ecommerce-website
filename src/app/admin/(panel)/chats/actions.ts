"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { newLeadNumber } from "@/lib/refs";
import { contactFromChat } from "@/lib/admin/chat-contact";

type Result = { ok: true; message?: string; id?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageLeads");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

type Msg = { role: string; content: string };

/** Turn a chat into a lead when the visitor left an email or number in it. */
export async function leadFromChat(chatId: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to add leads." };
  const chat = await db.aiConversation.findUnique({ where: { id: chatId } });
  if (!chat) return { ok: false, error: "Chat not found." };
  if (chat.leadId) return { ok: true, id: chat.leadId, message: "Already a lead." };
  const msgs = (Array.isArray(chat.messages) ? (chat.messages as Msg[]) : []).filter((m) => m && typeof m.content === "string");
  const { email, phone } = contactFromChat(msgs);
  if (!email && !phone) return { ok: false, error: "The visitor didn't leave an email or phone number in this chat." };
  const session = chat.sessionId ? await db.session.findUnique({ where: { id: chat.sessionId }, select: { country: true, city: true } }) : null;
  const customer = email
    ? await db.customer.upsert({ where: { email }, update: {}, create: { email, name: "Chat visitor", phone, country: session?.country, source: "AI_ASSISTANT" }, select: { id: true } })
    : null;
  const transcript = msgs.map((m) => `${m.role === "user" ? "Customer" : "Assistant"}: ${m.content}`).join("\n").slice(0, 12_000);
  const lead = await db.lead.create({
    data: {
      leadNumber: newLeadNumber(),
      source: "AI_ASSISTANT",
      customerId: customer?.id ?? null,
      name: "Chat visitor",
      email,
      phone,
      country: session?.country ?? null,
      city: session?.city ?? null,
      preferredChannel: email ? "email" : "whatsapp",
      message: `— Assistant conversation —\n${transcript}`,
      sessionId: chat.sessionId,
      meta: { origin: "Website chat", addedBy: admin.email },
    },
    select: { id: true, leadNumber: true },
  });
  await db.aiConversation.update({ where: { id: chatId }, data: { leadId: lead.id } });
  await audit(admin, "lead.from_chat", "Lead", lead.id);
  revalidateTag("admin", { expire: 0 });
  revalidatePath("/admin/chats");
  return { ok: true, id: lead.id, message: `Lead ${lead.leadNumber} created.` };
}

export async function deleteChat(chatId: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  await db.aiConversation.delete({ where: { id: chatId } }).catch(() => null);
  await audit(admin, "chat.delete", "AiConversation", chatId);
  revalidatePath("/admin/chats");
  return { ok: true };
}
