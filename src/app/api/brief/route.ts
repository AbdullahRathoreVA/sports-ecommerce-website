import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBrief } from "@/lib/ai/brief";
import { hit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({ text: z.string().trim().min(8).max(4000) });

export async function POST(request: Request) {
  if (!hit(`brief:${clientIp(request.headers)}`, 10, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please describe what you need in a sentence or two." }, { status: 400 });
  const result = await parseBrief(parsed.data.text);
  return NextResponse.json(result);
}
