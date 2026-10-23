"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, changedFields, requireAdmin, type Permission } from "@/lib/auth";
import { SETTINGS_TAG, siteSettingsSchema, getSettings } from "@/lib/settings";
import { CATALOG_TAG, CONTENT_TAG } from "@/lib/catalog";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

async function guard(permission: Permission = "manageContent") {
  try {
    return await requireAdmin(permission);
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const firstIssue = (e: z.ZodError) => {
  const i = e.issues[0];
  return i ? `${i.path.join(" › ")}${i.path.length ? ": " : ""}${i.message}` : "Check the form";
};

/* ── Site settings ─────────────────────────────────────────────────────── */

export async function saveSettings(input: unknown): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to change settings." };
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const before = await getSettings();
  await db.setting.upsert({
    where: { key: "site" },
    create: { key: "site", value: parsed.data, updatedBy: admin.email },
    update: { value: parsed.data, updatedBy: admin.email },
  });
  await audit(admin, "settings.update", "Setting", "site", changedFields(before as unknown as Record<string, unknown>, parsed.data as unknown as Record<string, unknown>));
  updateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved — the site is updated." };
}

/* ── FAQs ──────────────────────────────────────────────────────────────── */

const faqSchema = z.object({
  question: z.string().trim().min(5).max(200),
  answer: z.string().trim().min(5).max(3000),
  topic: z.string().trim().min(1).max(40),
  position: z.number().int().min(0).max(999),
  published: z.boolean(),
});

export async function saveFaq(id: string | null, input: z.input<typeof faqSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = faqSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const row = id ? await db.faq.update({ where: { id }, data: parsed.data }) : await db.faq.create({ data: parsed.data });
  await audit(admin, id ? "faq.update" : "faq.create", "Faq", row.id, { question: parsed.data.question });
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/content");
  return { ok: true, message: "FAQ saved." };
}

/* Testimonials: managed only in Admin → Reviews (consent, verification and moderation rules live there). */

/* ── Certifications (verifiable only) ──────────────────────────────────── */

const certSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    issuer: z.string().trim().max(80).optional(),
    reference: z.string().trim().max(80).optional(),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    fileUrl: z.string().trim().max(300).regex(/^(\/|https:\/\/)/, "Use a site path or https link").optional().or(z.literal("")),
    position: z.number().int().min(0).max(999),
    published: z.boolean(),
  })
  .refine((c) => !c.published || (c.reference && c.issuer), { message: "Add the issuer and certificate number before publishing — buyers verify these", path: ["reference"] });

export async function saveCertification(id: string | null, input: z.input<typeof certSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = certSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;
  const data = { name: d.name, issuer: d.issuer || null, reference: d.reference || null, validUntil: d.validUntil ? new Date(d.validUntil) : null, fileUrl: d.fileUrl || null, position: d.position, published: d.published };
  const row = id ? await db.certification.update({ where: { id }, data }) : await db.certification.create({ data });
  await audit(admin, id ? "certification.update" : "certification.create", "Certification", row.id, { name: d.name, published: d.published });
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/content");
  return { ok: true, message: "Certification saved." };
}

/* ── Buyer guides (posts) ──────────────────────────────────────────────── */

const postSchema = z.object({
  title: z.string().trim().min(5).max(140),
  slug: z.string().trim().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
  excerpt: z.string().trim().min(10).max(400),
  body: z.string().trim().min(20).max(60_000),
  coverImage: z.string().regex(/^\/(uploads|media)\/[\w./-]+$/).optional().or(z.literal("")),
  coverAlt: z.string().trim().max(200).optional(),
  topic: z.string().trim().min(1).max(40),
  published: z.boolean(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDesc: z.string().trim().max(170).optional(),
});

export async function savePost(id: string | null, input: z.input<typeof postSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;
  const clash = await db.post.findFirst({ where: { slug: d.slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) return { ok: false, error: "Another guide already uses this slug." };
  const existing = id ? await db.post.findUnique({ where: { id }, select: { publishedAt: true, slug: true } }) : null;
  const data = {
    ...d,
    coverImage: d.coverImage || null,
    coverAlt: d.coverAlt || null,
    seoTitle: d.seoTitle || null,
    seoDesc: d.seoDesc || null,
    publishedAt: d.published ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
  };
  const row = id ? await db.post.update({ where: { id }, data }) : await db.post.create({ data });
  await audit(admin, id ? "post.update" : "post.create", "Post", row.id, { title: d.title, published: d.published });
  updateTag(CONTENT_TAG);
  revalidatePath(`/insights/${d.slug}`);
  if (existing && existing.slug !== d.slug) revalidatePath(`/insights/${existing.slug}`);
  revalidatePath("/insights");
  revalidatePath("/admin/content");
  return { ok: true, message: d.published ? "Guide saved and published." : "Guide saved as a draft." };
}

/* ── Deletes ───────────────────────────────────────────────────────────── */

export async function deleteContent(kind: "faq" | "testimonial" | "certification" | "post", id: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  if (kind === "faq") await db.faq.delete({ where: { id } });
  else if (kind === "testimonial") await db.testimonial.delete({ where: { id } });
  else if (kind === "certification") await db.certification.delete({ where: { id } });
  else await db.post.delete({ where: { id } });
  await audit(admin, `${kind}.delete`, kind, id);
  updateTag(CONTENT_TAG);
  revalidatePath("/admin/content");
  return { ok: true };
}

/* ── Sample data ───────────────────────────────────────────────────────── */

/**
 * Removes the simulated analytics, orders, leads and customers that make the
 * preview dashboard look alive. Real records (isDemo = false) are never
 * touched. Starter catalogue products are kept — edit or archive those
 * individually.
 */
export async function purgeDemoData(confirmation: string): Promise<Result> {
  const admin = await guard("purgeDemoData");
  if (!admin) return { ok: false, error: "Only an owner or admin can do this." };
  if (confirmation.trim().toUpperCase() !== "DELETE SAMPLE DATA") return { ok: false, error: 'Type "DELETE SAMPLE DATA" to confirm.' };

  const [orders, leads] = await Promise.all([
    db.order.findMany({ where: { isDemo: true }, select: { id: true } }),
    db.lead.findMany({ where: { isDemo: true }, select: { id: true } }),
  ]);
  const orderIds = orders.map((o) => o.id);
  const leadIds = leads.map((l) => l.id);

  const counts = await db.$transaction(async (tx) => {
    await tx.emailLog.deleteMany({ where: { OR: [{ orderId: { in: orderIds } }, { leadId: { in: leadIds } }] } });
    await tx.aiConversation.deleteMany({ where: { leadId: { in: leadIds } } });
    const o = await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    const l = await tx.lead.deleteMany({ where: { id: { in: leadIds } } });
    const c = await tx.customer.deleteMany({ where: { isDemo: true, orders: { none: {} }, leads: { none: {} } } });
    const e = await tx.event.deleteMany({ where: { isDemo: true } });
    const s = await tx.session.deleteMany({ where: { isDemo: true } });
    const v = await tx.visitor.deleteMany({ where: { isDemo: true, sessionRows: { none: {} } } });
    return { orders: o.count, leads: l.count, customers: c.count, events: e.count, sessions: s.count, visitors: v.count };
  }, { timeout: 60_000 });

  await audit(admin, "demo.purge", "System", null, counts);
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Removed ${counts.orders} orders, ${counts.leads} leads, ${counts.customers} customers, ${counts.sessions.toLocaleString()} sessions and ${counts.events.toLocaleString()} events.` };
}

/* ── Product categories (home page "product lines" cards) ───────────── */

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  shortName: z.string().trim().max(40),
  tagline: z.string().trim().max(120),
  description: z.string().trim().min(10).max(2000),
  image: z.string().trim().max(300).refine((v) => v === "" || /^\/(uploads|media)\//.test(v), "Upload the photo here"),
  imageAlt: z.string().trim().max(160),
  position: z.number().int().min(0).max(999),
  published: z.boolean(),
});

export async function saveCategory(id: string, input: z.input<typeof categorySchema>): Promise<Result> {
  const admin = await guard("manageProducts");
  if (!admin) return { ok: false, error: "You don't have permission to change categories." };
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;
  const row = await db.category.update({
    where: { id },
    data: { ...d, shortName: d.shortName || null, tagline: d.tagline || null, image: d.image || null, imageAlt: d.imageAlt || d.name },
  });
  await audit(admin, "category.update", "Category", row.id, { name: d.name, published: d.published });
  updateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved — the site is updated." };
}

const newCategorySchema = z.object({
  name: z.string().trim().min(2, "Give the category a name").max(60),
  tagline: z.string().trim().max(120),
  description: z.string().trim().max(2000),
});

const slugOf = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "category";

/** A new product line (e.g. "Cricket kits"). Starts hidden until it has a photo and products. */
export async function createCategory(input: z.input<typeof newCategorySchema>): Promise<Result & { id?: string }> {
  const admin = await guard("manageProducts");
  if (!admin) return { ok: false, error: "You don't have permission to add categories." };
  const parsed = newCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;
  if (await db.category.findFirst({ where: { name: { equals: d.name, mode: "insensitive" } }, select: { id: true } })) return { ok: false, error: "A category with that name already exists." };
  let slug = slugOf(d.name);
  for (let i = 2; await db.category.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${slugOf(d.name)}-${i}`;
  const last = await db.category.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  const row = await db.category.create({
    data: {
      slug,
      name: d.name,
      tagline: d.tagline || null,
      description: d.description || `${d.name} made to order in our factory in Sialkot — your colours, your logo.`,
      position: (last?.position ?? 0) + 1,
      published: false,
    },
  });
  await audit(admin, "category.create", "Category", row.id, { name: d.name });
  updateTag(CATALOG_TAG);
  revalidatePath("/admin/content");
  return { ok: true, id: row.id, message: "Category created. Add a photo and products, then tick “Show this category on the site”." };
}

/** Only an empty category can be deleted — products are never removed by accident. */
export async function deleteCategory(id: string): Promise<Result> {
  const admin = await guard("manageProducts");
  if (!admin) return { ok: false, error: "You don't have permission to delete categories." };
  const row = await db.category.findUnique({ where: { id }, select: { name: true, _count: { select: { products: true } } } });
  if (!row) return { ok: false, error: "Category not found." };
  if (row._count.products > 0) return { ok: false, error: `“${row.name}” still has ${row._count.products} product${row._count.products === 1 ? "" : "s"}. Move them to another category (Products → edit → Category) or delete them first — or just hide the category.` };
  await db.category.delete({ where: { id } });
  await audit(admin, "category.delete", "Category", id, { name: row.name });
  updateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
  return { ok: true, message: "Category deleted." };
}
