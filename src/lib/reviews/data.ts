import "server-only";
import { db, hasDatabase } from "@/lib/db";
import { reviewStats, type ReviewStats } from "@/lib/reviews/stats";
import { demoReviews, demoReviewsEnabled } from "@/lib/reviews/demo";

/**
 * The public review feed. Production rows only: published, not demo, not
 * rejected or spam. Private fields (email, notes, order, verification note)
 * are never selected. Demo fixtures appear only in local dev / previews
 * with REVIEWS_DEMO=1, and are flagged so every card is labelled.
 */

export type PublicReview = {
  id: string;
  author: string;
  role: string | null;
  company: string | null;
  country: string | null;
  title: string | null;
  quote: string;
  rating: number | null;
  photo: string | null;
  productLine: string | null;
  verified: boolean;
  response: string | null;
  createdAt: Date;
  isDemo?: boolean;
};

export type ReviewQuery = { category?: string; rating?: number; verified?: boolean; sort?: "newest" | "highest" | "lowest"; page?: number };
export const PAGE_SIZE = 12;

const PUBLIC_SELECT = { id: true, author: true, role: true, company: true, country: true, title: true, quote: true, rating: true, photo: true, productLine: true, verified: true, response: true, createdAt: true } as const;

async function allPublic(): Promise<{ rows: PublicReview[]; demo: boolean }> {
  if (demoReviewsEnabled()) return { rows: demoReviews(), demo: true };
  if (!hasDatabase()) return { rows: [], demo: false };
  const rows = await db.testimonial
    .findMany({ where: { published: true, isDemo: false, rejected: false, spam: false }, orderBy: { createdAt: "desc" }, select: PUBLIC_SELECT, take: 2000 })
    .catch(() => []);
  return { rows, demo: false };
}

export async function getReviewPage(q: ReviewQuery): Promise<{ stats: ReviewStats; items: PublicReview[]; total: number; page: number; pages: number; demo: boolean; categories: string[] }> {
  const { rows, demo } = await allPublic();
  const stats = reviewStats(rows.map((r) => ({ ...r, published: true })), { includeDemo: demo });
  let list = rows;
  if (q.category) list = list.filter((r) => (r.productLine ?? "General") === q.category);
  if (q.rating) list = list.filter((r) => r.rating === q.rating);
  if (q.verified) list = list.filter((r) => r.verified && !r.isDemo);
  const by = q.sort ?? "newest";
  list = [...list].sort((a, b) =>
    by === "highest" ? (b.rating ?? 0) - (a.rating ?? 0) || +b.createdAt - +a.createdAt : by === "lowest" ? (a.rating ?? 6) - (b.rating ?? 6) || +b.createdAt - +a.createdAt : +b.createdAt - +a.createdAt,
  );
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, q.page ?? 1), pages);
  return { stats, items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: list.length, page, pages, demo, categories: stats.byCategory.map((c) => c.name) };
}
