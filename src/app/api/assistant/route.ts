import { NextResponse, after } from "next/server";
import { z } from "zod";
import { answer } from "@/lib/ai/assistant";
import { hit, clientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { isValidId } from "@/lib/analytics/classify";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20),
  productSlug: z.string().max(80).optional(),
  sessionId: z.string().max(40).optional(),
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  // Generous for people, a wall for scripts — and it protects the free AI quota.
  if (!hit(`ai:${ip}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages[parsed.data.messages.length - 1]!.role !== "user") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { messages, productSlug, sessionId } = parsed.data;
  const result = await answer(messages, productSlug);

  // Keep transcripts for quality review (no contact details are collected here).
  // Saved after the response is sent, so the visitor never waits on the database.
  if (sessionId && isValidId(sessionId)) {
    const transcript = [...messages, { role: "assistant" as const, content: result.reply }];
    after(async () => {
      try {
        const existing = await db.aiConversation.findFirst({ where: { kind: "assistant", sessionId }, select: { id: true } });
        if (existing) await db.aiConversation.update({ where: { id: existing.id }, data: { messages: transcript, engine: result.engine } });
        else await db.aiConversation.create({ data: { kind: "assistant", sessionId, messages: transcript, engine: result.engine } });
      } catch (error) {
        console.error("[assistant] transcript save failed", error);
      }
    });
  }

  return NextResponse.json(result);
}
