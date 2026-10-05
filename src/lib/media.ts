import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Admin image uploads. Stored in Postgres (free, one system) and served by
 * /uploads/[id] with an immutable cache header, so after the first request
 * the CDN serves it. Swap this module for object storage later without
 * touching callers.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel request bodies cap at 4.5 MB.
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export class UploadError extends Error {}

/** Sniff the real type from magic bytes — never trust the declared MIME type. */
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70 && String.fromCharCode(...b.slice(8, 12)).startsWith("avi")) return "image/avif";
  return null;
}

function dimensions(b: Uint8Array, type: string): { width?: number; height?: number } {
  try {
    if (type === "image/png") return { width: (b[16]! << 24) | (b[17]! << 16) | (b[18]! << 8) | b[19]!, height: (b[20]! << 24) | (b[21]! << 16) | (b[22]! << 8) | b[23]! };
    if (type === "image/jpeg") {
      let i = 2;
      while (i < b.length) {
        if (b[i] !== 0xff) break;
        const marker = b[i + 1]!;
        const len = (b[i + 2]! << 8) | b[i + 3]!;
        if (marker >= 0xc0 && marker <= 0xc3) return { height: (b[i + 5]! << 8) | b[i + 6]!, width: (b[i + 7]! << 8) | b[i + 8]! };
        i += 2 + len;
      }
    }
    if (type === "image/webp") {
      const chunk = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!);
      if (chunk === "VP8X") return { width: 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16)), height: 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16)) };
      if (chunk === "VP8 ") return { width: (b[26]! | (b[27]! << 8)) & 0x3fff, height: (b[28]! | (b[29]! << 8)) & 0x3fff };
      if (chunk === "VP8L") {
        const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
    }
  } catch {
    /* unknown layout — dimensions are optional */
  }
  return {};
}

export async function saveUpload(file: File, uploadedBy: string) {
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 4 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniff(bytes);
  if (!type || !ALLOWED.has(type)) throw new UploadError("Upload a JPG, PNG, WebP or AVIF image.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const existing = await db.mediaAsset.findUnique({ where: { sha256 }, select: { id: true, width: true, height: true } });
  if (existing) return { id: existing.id, url: `/uploads/${existing.id}`, width: existing.width, height: existing.height };
  const dims = dimensions(bytes, type);
  const asset = await db.mediaAsset.create({
    data: {
      sha256,
      filename: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "upload",
      mimeType: type,
      bytes: Buffer.from(bytes),
      size: bytes.length,
      width: dims.width ?? null,
      height: dims.height ?? null,
      uploadedBy,
    },
    select: { id: true, width: true, height: true },
  });
  return { id: asset.id, url: `/uploads/${asset.id}`, width: asset.width, height: asset.height };
}
