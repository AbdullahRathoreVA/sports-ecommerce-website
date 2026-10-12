import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { getCategories } from "@/lib/catalog";
import { siteUrl } from "@/config/site";
import { cn } from "@/lib/utils";
import { AskForReview, ReviewBoard } from "./board";

export const metadata: Metadata = { title: "Reviews" };

const TABS = [
  ["pending", "Waiting for you"],
  ["published", "On the website"],
  ["hidden", "Hidden"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function ReviewsAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdminPage("manageContent");
  const { tab: raw } = await searchParams;
  const [counts, categories] = await Promise.all([
    Promise.all([db.testimonial.count({ where: { pending: true } }), db.testimonial.count({ where: { published: true } }), db.testimonial.count({ where: { published: false, pending: false } })]),
    getCategories(),
  ]);
  const tab: Tab = TABS.some(([k]) => k === raw) ? (raw as Tab) : counts[0] > 0 ? "pending" : "published";
  const where = tab === "pending" ? { pending: true } : tab === "published" ? { published: true } : { published: false, pending: false };
  const rows = await db.testimonial.findMany({ where, orderBy: [{ featured: "desc" }, { createdAt: "desc" }] });
  const count = { pending: counts[0], published: counts[1], hidden: counts[2] };

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Client reviews shown on the home page and the Reviews page. Customers can send one from the website; you approve it first. You can also add reviews you received on WhatsApp or email."
      />
      <AskForReview link={`${siteUrl}/reviews/new`} />
      <div className="mb-5 mt-6 flex flex-wrap gap-1.5">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/reviews?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium", tab === k ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
            {label} <span className="font-mono text-xs opacity-60">{count[k]}</span>
          </Link>
        ))}
      </div>
      <ReviewBoard
        tab={tab}
        productLines={categories.map((c) => c.name)}
        rows={rows.map((r) => ({
          id: r.id,
          author: r.author,
          role: r.role ?? "",
          company: r.company ?? "",
          country: r.country ?? "",
          email: r.email ?? "",
          productLine: r.productLine ?? "",
          rating: r.rating,
          quote: r.quote,
          photo: r.photo ?? "",
          verified: r.verified,
          featured: r.featured,
          published: r.published,
          pending: r.pending,
          source: r.source,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
