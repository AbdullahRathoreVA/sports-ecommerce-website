import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ReviewCard, Stars } from "@/components/site/review-card";
import { getReviewPage, type ReviewQuery } from "@/lib/reviews/data";
import { DEMO_LABEL } from "@/lib/reviews/demo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Customer reviews & feedback",
  description: "Reviews from clubs, schools and brands that ordered from Alrobel Sportswear — published with their permission, verified buyers marked.",
  alternates: { canonical: "/reviews" },
};

type SP = { category?: string; rating?: string; verified?: string; sort?: string; page?: string };

function parse(sp: SP): ReviewQuery {
  const rating = Number(sp.rating);
  return {
    category: sp.category?.slice(0, 80) || undefined,
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined,
    verified: sp.verified === "1",
    sort: sp.sort === "highest" || sp.sort === "lowest" ? sp.sort : "newest",
    page: Math.max(1, Number(sp.page) || 1),
  };
}

const href = (q: ReviewQuery, patch: Partial<ReviewQuery>) => {
  const n = { ...q, ...patch };
  const p = new URLSearchParams();
  if (n.category) p.set("category", n.category);
  if (n.rating) p.set("rating", String(n.rating));
  if (n.verified) p.set("verified", "1");
  if (n.sort && n.sort !== "newest") p.set("sort", n.sort);
  if (n.page && n.page > 1) p.set("page", String(n.page));
  const s = p.toString();
  return `/reviews${s ? `?${s}` : ""}#list`;
};

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const q = parse(await searchParams);
  const { stats, items, total, page, pages, demo, categories } = await getReviewPage(q);
  const filtered = Boolean(q.category || q.rating || q.verified);
  const showFilters = stats.count >= 6;

  return (
    <>
      <PageHero
        eyebrow="Customer reviews & feedback"
        title="In our clients' words"
        intro="Every review here comes from a customer who worked with us and agreed to publish it. Reviews marked “Verified buyer” are matched to a real order. We publish critical reviews too."
        meta={[
          { label: "Published reviews", value: String(stats.count) },
          { label: "Average", value: stats.average != null ? `${stats.average.toFixed(1)} / 5` : "—" },
          { label: "Verified buyers", value: String(stats.verified) },
          { label: "Latest", value: stats.latest ? stats.latest.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—" },
        ]}
      />

      {demo && (
        <p className="sticky top-16 z-30 bg-amber-400 px-4 py-2 text-center text-sm font-bold text-black" role="status">
          {DEMO_LABEL} — development preview only. Nothing on this page is a real customer.
        </p>
      )}

      <section className="container-x pb-24 pt-10 lg:pt-14">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Rating summary — calculated from published reviews only */}
          <div className="rounded-[var(--radius-card)] border hairline bg-surface p-6">
            {stats.count === 0 ? (
              <div className="text-center">
                <MessageSquareQuote className="mx-auto h-10 w-10 text-accent" aria-hidden />
                <h2 className="mt-4 text-xl font-semibold">We&apos;re collecting our first reviews</h2>
                <p className="mx-auto mt-2 max-w-md text-muted">
                  We only publish genuine feedback from customers who have worked with us, with their permission — so there&apos;s no rating here yet. If you&apos;ve ordered from Alrobel, your review would help other buyers.
                </p>
                <Link href="/reviews/new" className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-control)] bg-accent px-5 font-semibold text-white" data-track="cta_click" data-track-label="Reviews empty: write">
                  Write a review
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="text-center sm:pr-6">
                  <p className="font-display text-5xl font-semibold tabular-nums">{stats.average?.toFixed(1) ?? "—"}</p>
                  {stats.average != null && <Stars value={Math.round(stats.average)} className="mt-2 justify-center" />}
                  <p className="mt-2 text-sm text-muted">
                    {stats.rated} rated review{stats.rated === 1 ? "" : "s"}
                  </p>
                </div>
                <ol className="space-y-1.5" aria-label="Rating distribution">
                  {[5, 4, 3, 2, 1].map((n) => {
                    const c = stats.distribution[n - 1];
                    const pct = stats.rated ? Math.round((c / stats.rated) * 100) : 0;
                    return (
                      <li key={n}>
                        <Link href={href(q, { rating: q.rating === n ? undefined : n, page: 1 })} className="grid grid-cols-[3.2rem_1fr_5rem] items-center gap-2 whitespace-nowrap text-sm hover:text-accent">
                          <span>{n} star</span>
                          <span className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                            <span className="block h-full rounded-full bg-[#f5b301]" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="text-right tabular-nums text-muted">
                            {c} <span className="sr-only">reviews</span>({pct}%)
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border hairline bg-surface p-6">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden /> How reviews work here
            </p>
            <ul className="space-y-2 text-sm text-muted">
              <li>• Every review is read by our team before it is published. We don&apos;t remove reviews because they are critical.</li>
              <li className="flex gap-1">
                • <span><BadgeCheck className="mb-0.5 inline h-4 w-4 text-emerald-500" aria-hidden /> <strong className="text-fg">Verified buyer</strong> means the review came from a private review link sent for a real order, or our team matched it to an order.</span>
              </li>
              <li>• Reviewers agree to publication; their email and order details are never shown.</li>
            </ul>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link href="/reviews/new" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover" data-track="cta_click" data-track-label="Reviews: leave a review">
                Leave a review <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/quote" className="inline-flex h-11 items-center rounded-[var(--radius-control)] border hairline px-5 text-sm font-semibold" data-track="quote_start" data-track-label="Reviews page">
                Request a quote
              </Link>
            </div>
          </div>
        </div>

        {stats.byCategory.length > 1 && (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Reviews by product">
            {stats.byCategory.map((c) => (
              <li key={c.name}>
                <Link href={href(q, { category: q.category === c.name ? undefined : c.name, page: 1 })} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm", q.category === c.name ? "border-accent bg-accent text-white" : "hairline hover:border-accent")}>
                  {c.name} <span className="text-xs opacity-70">{c.count}{c.average != null ? ` · ${c.average.toFixed(1)}★` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {stats.count > 0 && (
          <div id="list" className="scroll-mt-28">
            {showFilters && (
              <form method="get" action="/reviews" className="mt-8 flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border hairline bg-surface p-4" aria-label="Filter reviews">
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold text-muted">Product</span>
                  <select name="category" defaultValue={q.category ?? ""} className="h-10 rounded-lg border hairline bg-transparent px-3">
                    <option value="">All products</option>
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold text-muted">Rating</span>
                  <select name="rating" defaultValue={q.rating ? String(q.rating) : ""} className="h-10 rounded-lg border hairline bg-transparent px-3">
                    <option value="">Any rating</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} star{n === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-xs font-semibold text-muted">Sort</span>
                  <select name="sort" defaultValue={q.sort} className="h-10 rounded-lg border hairline bg-transparent px-3">
                    <option value="newest">Newest first</option>
                    <option value="highest">Highest rated</option>
                    <option value="lowest">Lowest rated</option>
                  </select>
                </label>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <input type="checkbox" name="verified" value="1" defaultChecked={q.verified} className="h-4 w-4 accent-[var(--color-accent)]" /> Verified buyers only
                </label>
                <button className="h-10 rounded-lg bg-ink px-4 text-sm font-semibold text-white">Apply</button>
                {filtered && (
                  <Link href="/reviews#list" className="h-10 content-center text-sm font-semibold text-accent">
                    Clear filters
                  </Link>
                )}
              </form>
            )}

            <p className="mt-6 text-sm text-muted" aria-live="polite">
              Showing {items.length} of {total} review{total === 1 ? "" : "s"}
              {filtered ? " matching your filters" : ""}.
            </p>
            {items.length === 0 ? (
              <div className="mt-4 rounded-[var(--radius-card)] border hairline bg-surface p-8 text-center">
                <p className="font-semibold">No reviews match these filters yet.</p>
                <Link href="/reviews#list" className="mt-3 inline-block text-sm font-semibold text-accent">
                  Show all reviews
                </Link>
              </div>
            ) : (
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((r) => (
                  <li key={r.id}>
                    <ReviewCard r={r} />
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Review pages">
                {page > 1 && (
                  <Link href={href(q, { page: page - 1 })} className="h-10 content-center rounded-lg border hairline px-4 text-sm font-semibold">
                    ← Previous
                  </Link>
                )}
                <span className="px-3 text-sm text-muted">
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link href={href(q, { page: page + 1 })} className="h-10 content-center rounded-lg border hairline px-4 text-sm font-semibold">
                    Next →
                  </Link>
                )}
              </nav>
            )}
          </div>
        )}
      </section>
    </>
  );
}
