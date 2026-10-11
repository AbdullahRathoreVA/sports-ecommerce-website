"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { CATALOG_TAG, CONTENT_TAG } from "@/lib/catalog";

/**
 * Photo manager: put any uploaded photo where it belongs (a product's gallery,
 * a category card, a buyer-guide cover), make a product photo the main one,
 * move it, or delete it. Customers' own attachments are never touched here.
 */

export type PhotoResult = { ok: true; message: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageProducts");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

function refresh() {
  updateTag(CATALOG_TAG);
  updateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/admin/photos");
}

const SITE_PHOTO = /^\/(uploads|media)\/[\w./-]+$/;

const target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), productId: z.string().min(1).max(40), main: z.boolean() }),
  z.object({ type: z.literal("category"), categoryId: z.string().min(1).max(40) }),
  z.object({ type: z.literal("post"), postId: z.string().min(1).max(40) }),
]);

const assignSchema = z.object({
  url: z.string().regex(SITE_PHOTO),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  alt: z.string().trim().max(160).optional(),
  target,
  /** When moving an existing product photo, the row it moves from. */
  fromProductImageId: z.string().max(40).optional(),
});

export async function assignPhoto(input: z.input<typeof assignSchema>): Promise<PhotoResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to manage photos." };
  const parsed = assignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That photo or place isn't valid." };
  const d = parsed.data;
  let where = "";

  if (d.target.type === "product") {
    const product = await db.product.findUnique({ where: { id: d.target.productId }, select: { id: true, name: true } });
    if (!product) return { ok: false, error: "Product not found." };
    const alt = d.alt || product.name;
    await db.$transaction(async (tx) => {
      if (d.target.type !== "product") return;
      if (d.target.main) {
        // Main photo = position 0; everything else shifts back one.
        await tx.productImage.updateMany({ where: { productId: product.id }, data: { position: { increment: 1 } } });
      }
      const last = await tx.productImage.aggregate({ where: { productId: product.id }, _max: { position: true } });
      await tx.productImage.create({
        data: { productId: product.id, url: d.url, alt, width: d.width ?? null, height: d.height ?? null, source: "client", position: d.target.main ? 0 : (last._max.position ?? -1) + 1 },
      });
      if (d.fromProductImageId) await tx.productImage.deleteMany({ where: { id: d.fromProductImageId } });
    });
    where = `${product.name}${d.target.main ? " (main photo)" : ""}`;
  } else if (d.target.type === "category") {
    const cat = await db.category.update({ where: { id: d.target.categoryId }, data: { image: d.url, imageAlt: d.alt || undefined }, select: { name: true } }).catch(() => null);
    if (!cat) return { ok: false, error: "Category not found." };
    if (d.fromProductImageId) await db.productImage.deleteMany({ where: { id: d.fromProductImageId } });
    where = `the ${cat.name} category card`;
  } else {
    const post = await db.post.update({ where: { id: d.target.postId }, data: { coverImage: d.url, coverAlt: d.alt || undefined }, select: { title: true } }).catch(() => null);
    if (!post) return { ok: false, error: "Guide not found." };
    if (d.fromProductImageId) await db.productImage.deleteMany({ where: { id: d.fromProductImageId } });
    where = `the cover of “${post.title}”`;
  }

  await audit(admin, d.fromProductImageId ? "photo.move" : "photo.assign", "Photo", d.url, { where });
  refresh();
  return { ok: true, message: `Done — the photo is now on ${where}.` };
}

const deleteSchema = z.object({
  kind: z.enum(["product", "category", "post", "upload"]),
  id: z.string().min(1).max(40),
});

/** Removes a photo from the site. Uploaded files are erased once nothing uses them any more. */
export async function deletePhoto(input: z.input<typeof deleteSchema>): Promise<PhotoResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to manage photos." };
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { kind, id } = parsed.data;
  let url: string | null = null;

  if (kind === "product") {
    const row = await db.productImage.findUnique({ where: { id }, select: { url: true } });
    if (!row) return { ok: false, error: "Photo not found." };
    url = row.url;
    await db.productImage.delete({ where: { id } });
  } else if (kind === "category") {
    const row = await db.category.findUnique({ where: { id }, select: { image: true } });
    url = row?.image ?? null;
    await db.category.update({ where: { id }, data: { image: null } });
  } else if (kind === "post") {
    const row = await db.post.findUnique({ where: { id }, select: { coverImage: true } });
    url = row?.coverImage ?? null;
    await db.post.update({ where: { id }, data: { coverImage: null } });
  } else {
    url = `/uploads/${id}`;
  }

  // Erase the stored file only if it is an admin upload that nothing else uses (never a customer's attachment).
  const m = url?.match(/^\/uploads\/([a-z0-9]{10,40})$/);
  if (m) {
    const assetId = m[1]!;
    const [p, c, po, oa, asset] = await Promise.all([
      db.productImage.count({ where: { url: url! } }),
      db.category.count({ where: { image: url! } }),
      db.post.count({ where: { coverImage: url! } }),
      db.orderAttachment.count({ where: { mediaId: assetId } }),
      db.mediaAsset.findUnique({ where: { id: assetId }, select: { uploadedBy: true } }),
    ]);
    if (asset && asset.uploadedBy !== "visitor" && p + c + po + oa === 0) await db.mediaAsset.delete({ where: { id: assetId } });
  }

  await audit(admin, "photo.delete", "Photo", url ?? id, { kind });
  refresh();
  return { ok: true, message: "Photo removed from the website." };
}

export async function makeMainPhoto(productImageId: string): Promise<PhotoResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to manage photos." };
  const row = await db.productImage.findUnique({ where: { id: productImageId }, select: { productId: true, url: true } });
  if (!row) return { ok: false, error: "Photo not found." };
  const all = await db.productImage.findMany({ where: { productId: row.productId }, orderBy: { position: "asc" }, select: { id: true } });
  const order = [productImageId, ...all.map((a) => a.id).filter((x) => x !== productImageId)];
  await db.$transaction(order.map((id, i) => db.productImage.update({ where: { id }, data: { position: i } })));
  await audit(admin, "photo.make_main", "Photo", row.url);
  refresh();
  return { ok: true, message: "That's now the main photo." };
}
