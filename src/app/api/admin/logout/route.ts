import { NextResponse } from "next/server";
import { audit, clearSessionCookie, getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/admin/guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await getCurrentAdmin().catch(() => null);
  if (admin) await audit(admin, "auth.logout", "AdminUser", admin.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
