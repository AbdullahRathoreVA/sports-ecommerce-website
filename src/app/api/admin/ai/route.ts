import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, audit, requireAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/admin/guard";
import { hit } from "@/lib/rate-limit";
import { analyse } from "@/lib/ai/analyst";

export const maxDuration = 30;

const bodySchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) })).min(1).max(20),
  range: z.enum(["today", "yesterday", "7d", "30d", "90d"]).default("30d"),
  includeDemo: z.boolean().default(true),
  conversationId: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let admin;
  try {
    admin = await requireAdmin("useAdminAi");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: "Not allowed" }, { status: e.status });
    throw e;
  }
  const limit = hit(`admin-ai:${admin.id}`, 30, 10 * 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many questions — try again in a few minutes." }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { messages, range, includeDemo, conversationId } = parsed.data;

  const result = await analyse(messages, range, includeDemo);
  const transcript = [...messages, { role: "assistant" as const, content: result.reply }];
  let id = conversationId;
  try {
    const existing = id ? await db.aiConversation.findFirst({ where: { id, kind: "admin", actorEmail: admin.email }, select: { id: true } }) : null;
    if (existing) await db.aiConversation.update({ where: { id: existing.id }, data: { messages: transcript, engine: result.engine } });
    else id = (await db.aiConversation.create({ data: { kind: "admin", actorEmail: admin.email, messages: transcript, engine: result.engine } })).id;
  } catch (e) {
    console.error("[admin-ai] could not save conversation", e);
  }
  if (messages.length === 1) await audit(admin, "ai.analyst", "AiConversation", id ?? null, { range, question: messages[0]!.content.slice(0, 200) });
  return NextResponse.json({ reply: result.reply, engine: result.engine, period: result.period, conversationId: id });
}
