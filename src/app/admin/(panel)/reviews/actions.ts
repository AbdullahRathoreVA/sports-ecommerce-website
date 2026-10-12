"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit, AuthError, requireAdmin } from "@/lib/auth";
import { CONTENT_TAG } from "@/lib/catalog";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function guard() {
  try {
    return await requireAdmin("manageContent");
  } catch (e) {
    if (e instanceof AuthError) return null;
    throw e;
  }
}

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const reviewSchema = z
  .object({
    author: z.string().trim().min(2, "Add the reviewer's name").max(80),
    role: opt(80),
    company: opt(100),
    country: opt(60),
    email: opt(120),
    productLine: opt(80),
    rating: z.number().int().min(1).max(5).nullable(),
    quote: z.string().trim().min(10, "The review is too short").max(1200),
    photo: z.string().trim().max(300).optional().transform((v) => (v ? v : null)).refine((v) => !v || /^\/(uploads|media)\//.test(v), "Upload the photo here"),
    verified: z.boolean(),
    featured: z.boolean(),
    published: z.boolean(),
    confirmGenuine: z.boolean(),
  })
  .refine((r) => !r.published || r.confirmGenuine, { message: "Confirm this is a genuine review you have permission to publish", path: ["confirmGenuine"] });

const done = () => {
  updateTag(CONTENT_TAG);
  revalidateTag("admin", { expire: 0 });
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
};

/** Add (e.g. a review received on WhatsApp) or edit a review. */
export async function saveReview(id: string | null, input: z.input<typeof reviewSchema>): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "You don't have permission to manage reviews." };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the review." };
  const { confirmGenuine, ...data } = parsed.data;
  const row = id
    ? await db.testimonial.update({ where: { id }, data: { ...data, pending: false } })
    : await db.testimonial.create({ data: { ...data, source: "admin", pending: false } });
  await audit(admin, id ? "review.update" : "review.create", "Testimonial", row.id, { author: data.author, published: data.published, confirmGenuine });
  done();
  return { ok: true, message: data.published ? "Saved and live on the website." : "Saved (not shown on the website)." };
}

/** One-tap moderation: publish / hide / feature / verify. */
export async function setReview(id: string, patch: { published?: boolean; featured?: boolean; verified?: boolean }): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  await db.testimonial.update({ where: { id }, data: { ...patch, pending: false } });
  await audit(admin, "review.moderate", "Testimonial", id, patch);
  done();
  return { ok: true, message: patch.published === true ? "Published — it's on the website now." : patch.published === false ? "Hidden from the website." : "Saved." };
}

export async function deleteReview(id: string): Promise<Result> {
  const admin = await guard();
  if (!admin) return { ok: false, error: "Not allowed." };
  await db.testimonial.delete({ where: { id } }).catch(() => null);
  await audit(admin, "review.delete", "Testimonial", id);
  done();
  return { ok: true, message: "Review deleted." };
}
