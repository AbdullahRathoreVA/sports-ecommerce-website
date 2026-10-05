import { NextResponse } from "next/server";
import { AuthError, audit, can, requireAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/admin/guard";
import { saveUpload, UploadError } from "@/lib/media";
import { hit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const admin = await requireAdmin();
    if (!can(admin.role, "manageProducts") && !can(admin.role, "manageOrders")) throw new AuthError(403);
    if (!hit(`upload:${admin.id}`, 60, 10 * 60 * 1000).ok) return NextResponse.json({ error: "Too many uploads — wait a few minutes." }, { status: 429 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
    const saved = await saveUpload(file, admin.email);
    await audit(admin, "media.upload", "MediaAsset", saved.id, { filename: file.name, size: file.size });
    return NextResponse.json(saved);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "Not allowed" }, { status: error.status });
    if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("[upload] failed", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
