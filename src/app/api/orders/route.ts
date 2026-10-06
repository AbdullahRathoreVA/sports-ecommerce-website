import { NextResponse } from "next/server";
import { orderInputSchema, fieldErrors } from "@/lib/validation";
import { createOrder, OrderError } from "@/lib/orders";
import { hit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!hit(`order:${ip}`, 8, 30 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Too many attempts — please wait a few minutes." }, { status: 429 });
  }
  const parsed = orderInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ ok: true, orderNumber: "AL-000000-OK", token: "x" });

  try {
    const result = await createOrder(parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof OrderError) {
      const status = error.code === "PRICE_CHANGED" ? 409 : 422;
      return NextResponse.json({ error: error.message, code: error.code, detail: error.detail }, { status });
    }
    console.error("[orders] create failed", error);
    return NextResponse.json({ error: "We couldn't place your order just now. Nothing was charged — please try again." }, { status: 500 });
  }
}
