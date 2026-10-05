import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * DEVELOPMENT ONLY. Saves a canvas frame (data URL) under public/media/renders
 * so the 3D jersey can be exported as poster/product images. Returns 404 in
 * any production build — it never ships as a working endpoint.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  const { name, dataUrl } = (await request.json()) as { name?: string; dataUrl?: string };
  if (!name || !/^[a-z0-9-]{1,60}$/.test(name) || !dataUrl?.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const dir = path.join(process.cwd(), "public", "media", "renders");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await writeFile(file, Buffer.from(dataUrl.split(",")[1]!, "base64"));
  return NextResponse.json({ ok: true, file: `/media/renders/${name}.png` });
}
