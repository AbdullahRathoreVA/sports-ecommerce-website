import { NextResponse } from "next/server";
import { z } from "zod";
import { attemptLogin, setSessionCookie } from "@/lib/auth";
import { hit, clientIp } from "@/lib/rate-limit";
import { isSameOrigin, safeNext } from "@/lib/admin/guard";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Per-IP throttle in front of the per-account database lockout.
  const limit = hit(`login:${clientIp(request.headers)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

  try {
    const result = await attemptLogin(parsed.data.email, parsed.data.password);
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "locked"
              ? `Too many failed attempts. This account is locked for ${result.retryAfterMinutes ?? 15} minutes.`
              : "Email or password is incorrect.",
        },
        { status: result.reason === "locked" ? 423 : 401 },
      );
    }
    await setSessionCookie(result.token);
    return NextResponse.json({ ok: true, next: safeNext(parsed.data.next) });
  } catch (error) {
    console.error("[admin login] failed", error);
    return NextResponse.json({ error: "Sign-in is unavailable right now." }, { status: 500 });
  }
}
