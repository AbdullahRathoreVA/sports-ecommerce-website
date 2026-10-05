"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, changedFields, requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";

export type SaveResult = { ok: true; id: string; message?: string } | { ok: false; error: string; field?: string };

async function guard() {
  try {
    return await requireAdmin("manageProducts");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const money = z.number().int().min(0).max(10_000_000).nullable();
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));
const list = z.array(z.string().trim().min(1).max(160)).max(60);
// Images must live on this site (uploads or bundled media) — CSP blocks anything else.
const localUrl = z.string().regex(/^\/(uploads|media)\/[\w./-]+$/, "Images must be uploaded here");

const productSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(120),
    slug: z.string().trim().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
    sku: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/, "Letters, numbers, dots and dashes only"),
    subtitle: optText(160),
    categoryId: z.string().min(1, "Choose a category"),
    summary: z.string().trim().min(10, "Write a one-line summary").max(400),
    description: z.string().trim().min(10, "Write a description").max(20_000),
    status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
    featured: z.boolean(),
    isDemo: z.boolean(),
    position: z.number().int().min(0).max(9999),
    purchaseMode: z.enum(["QUOTE", "CART", "BOTH"]),
    currency: z.string().regex(/^[A-Z]{3}$/),
    priceCents: money,
    salePriceCents: money,
    samplePriceCents: money,
    priceTiers: z.array(z.object({ minQty: z.number().int().min(1).max(1_000_000), unitCents: z.number().int().min(0).max(10_000_000) })).max(12),
    moq: z.number().int().min(1).max(1_000_000),
    stock: z.number().int().min(0).max(10_000_000).nullable(),
    leadTimeMinDays: z.number().int().min(0).max(365).nullable(),
    leadTimeMaxDays: z.number().int().min(0).max(365).nullable(),
    specs: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(300) })).max(40),
    materials: list,
    customizations: list,
    features: list,
    sizes: list,
    tags: list,
    useCases: list,
    colors: z.array(z.object({ name: z.string().trim().min(1).max(40), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/) })).max(30),
    videoUrl: optText(300).refine((v) => !v || /^\/media\/[\w./-]+\.mp4$/.test(v), "Use a video path under /media/"),
    specSheetUrl: optText(300).refine((v) => !v || /^(\/|https:\/\/)/.test(v), "Use a site path or an https link"),
    seoTitle: optText(70),
    seoDesc: optText(170),
    images: z
      .array(
        z.object({
          url: localUrl,
          alt: z.string().trim().min(3, "Every photo needs a description (alt text)").max(200),
          width: z.number().int().positive().nullable(),
          height: z.number().int().positive().nullable(),
          source: z.enum(["client", "placeholder"]),
        }),
      )
      .max(20),
  })
  .superRefine((p, ctx) => {
    if (p.purchaseMode !== "QUOTE" && p.priceCents == null)
      ctx.addIssue({ code: "custom", path: ["priceCents"], message: "Products sold online need a price" });
    if (p.salePriceCents != null && p.priceCents != null && p.salePriceCents >= p.priceCents)
      ctx.addIssue({ code: "custom", path: ["salePriceCents"], message: "Sale price must be lower than the price" });
    if (p.leadTimeMinDays != null && p.leadTimeMaxDays != null && p.leadTimeMinDays > p.leadTimeMaxDays)
      ctx.addIssue({ code: "custom", path: ["leadTimeMaxDays"], message: "Maximum lead time is shorter than the minimum" });
    if (p.status === "ACTIVE" && p.images.length === 0)
      ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one photo before publishing" });
  });

export type ProductInput = z.input<typeof productSchema>;

export async function saveProduct(id: string | null, input: ProductInput): Promise<SaveResult> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to edit products." };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the form", field: issue?.path.join(".") };
  }
  const { images, ...p } = parsed.data;
  // Quantity breaks are stored ascending with one price per break.
  const priceTiers = [...new Map(p.priceTiers.map((t) => [t.minQty, t])).values()].sort((a, b) => a.minQty - b.minQty);

  const clash = await db.product.findFirst({
    where: { OR: [{ slug: p.slug }, { sku: p.sku }], ...(id ? { NOT: { id } } : {}) },
    select: { slug: true, sku: true },
  });
  if (clash) return clash.slug === p.slug ? { ok: false, error: "Another product already uses this URL slug.", field: "slug" } : { ok: false, error: "Another product already uses this SKU.", field: "sku" };
  if (!(await db.category.findUnique({ where: { id: p.categoryId }, select: { id: true } }))) return { ok: false, error: "Category not found.", field: "categoryId" };

  const data = { ...p, priceTiers };
  const imageRows = images.map((img, position) => ({ ...img, position }));

  if (id) {
    const pid = id;
    const before = await db.product.findUnique({ where: { id: pid }, include: { images: { orderBy: { position: "asc" } } } });
    if (!before) return { ok: false, error: "Product not found." };
    await db.$transaction([
      db.product.update({ where: { id }, data }),
      db.productImage.deleteMany({ where: { productId: id } }),
      db.productImage.createMany({ data: imageRows.map((r) => ({ ...r, productId: pid })) }),
    ]);
    const { images: beforeImages, ...beforeFields } = before;
    const diff = changedFields(beforeFields as unknown as Record<string, unknown>, data as Record<string, unknown>);
    if (JSON.stringify(beforeImages.map((i) => [i.url, i.alt])) !== JSON.stringify(images.map((i) => [i.url, i.alt]))) diff.images = { from: beforeImages.length, to: images.length };
    await audit(admin, "product.update", "Product", id, diff);
    if (before.slug !== p.slug) revalidatePath(`/products/${before.slug}`);
  } else {
    const created = await db.product.create({ data: { ...data, images: { create: imageRows } } });
    id = created.id;
    await audit(admin, "product.create", "Product", id, { name: p.name, sku: p.sku });
  }

  updateTag(CATALOG_TAG);
  revalidatePath(`/products/${p.slug}`);
  revalidatePath("/admin/products");
  return { ok: true, id, message: p.status === "ACTIVE" ? "Saved and live on the site." : "Saved." };
}

export async function deleteProduct(id: string): Promise<{ ok: true; archived: boolean } | { ok: false; error: string }> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const product = await db.product.findUnique({ where: { id }, select: { slug: true, name: true, _count: { select: { orderItems: true } } } });
  if (!product) return { ok: false, error: "Product not found." };
  // Products that appear on orders are archived, never deleted, so order history stays intact.
  if (product._count.orderItems > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED", featured: false } });
    await audit(admin, "product.archive", "Product", id, { name: product.name, reason: "has orders" });
  } else {
    await db.product.delete({ where: { id } });
    await audit(admin, "product.delete", "Product", id, { name: product.name });
  }
  updateTag(CATALOG_TAG);
  revalidatePath(`/products/${product.slug}`);
  revalidatePath("/admin/products");
  return { ok: true, archived: product._count.orderItems > 0 };
}
