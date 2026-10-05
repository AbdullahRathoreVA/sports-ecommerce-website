import { NextResponse } from "next/server";
import { leadInputSchema, fieldErrors } from "@/lib/validation";
import { createLead } from "@/lib/leads";
import { hit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = hit(`lead:${ip}`, 6, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions — please wait a few minutes or contact us directly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = leadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 400 });
  }

  // Honeypot: pretend success so bots learn nothing.
  if (parsed.data.website) return NextResponse.json({ ok: true, leadNumber: "RFQ-000000-OK" });

  try {
    const lead = await createLead(parsed.data);
    return NextResponse.json({ ok: true, leadNumber: lead.leadNumber });
  } catch (error) {
    console.error("[leads] create failed", error);
    return NextResponse.json({ error: "We couldn't save your request just now. Please try again in a moment." }, { status: 500 });
  }
}
