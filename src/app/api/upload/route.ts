import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/admin/guard";
import { saveUpload, UploadError } from "@/lib/media";
import { clientIp, hit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Visitor uploads (logo / artwork attached in the chat or quote form).
 * Images only (type sniffed from bytes), 4 MB max, de-duplicated by hash,
 * same-origin only and rate-limited per IP.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ip = clientIp(request.headers);
  const limit = hit(`visitor-upload:${ip}`, 8, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Too many uploads — please wait a few minutes." }, { status: 429 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
    const saved = await saveUpload(file, "visitor");
    return NextResponse.json({ id: saved.id, url: saved.url });
  } catch (error) {
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[visitor-upload] failed", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
