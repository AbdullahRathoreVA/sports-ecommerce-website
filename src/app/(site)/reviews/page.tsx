import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MessageSquareQuote } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { getPublishedTestimonials } from "@/lib/catalog";
import { ReviewCard, Stars, averageRating } from "@/components/site/review-card";

export const metadata: Metadata = {
  title: "Client reviews",
  description: "What clubs, schools and brands say about working with Alrobel Sportswear — real reviews from real orders.",
  alternates: { canonical: "/reviews" },
};

export const revalidate = 600;

export default async function ReviewsPage() {
  const reviews = await getPublishedTestimonials();
  const avg = averageRating(reviews);
  return (
    <>
      <PageHero
        eyebrow="Client reviews"
        title="In our clients' words"
        intro="Every review here comes from a real customer and is published with their permission. Worked with us? We'd love to hear how it went."
        meta={[
          { label: "Reviews", value: String(reviews.length) },
          { label: "Average", value: avg ? `${avg.value.toFixed(1)} / 5` : "—" },
          { label: "Published", value: "With permission" },
          { label: "Verified", value: "Matched to orders" },
        ]}
      />
      <section className="container-x pb-24 pt-10 lg:pt-14">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {avg ? (
            <p className="flex items-center gap-3 text-lg font-semibold">
              <Stars value={Math.round(avg.value)} /> {avg.value.toFixed(1)} out of 5
              <span className="text-sm font-normal text-muted">from {avg.count} rated review{avg.count === 1 ? "" : "s"}</span>
            </p>
          ) : (
            <span />
          )}
          <Link href="/reviews/new" className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 font-semibold text-white hover:bg-accent-hover" data-track="cta_click" data-track-label="Reviews: leave a review">
            Leave a review <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {reviews.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-[var(--radius-card)] border hairline bg-surface p-10 text-center">
            <MessageSquareQuote className="mx-auto h-10 w-10 text-accent" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold">Our first reviews are on their way</h2>
            <p className="mt-2 text-muted">We only publish genuine reviews from customers, with their permission. If you&apos;ve ordered from us, you could be the first.</p>
            <Link href="/reviews/new" className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-control)] bg-accent px-5 font-semibold text-white">Write a review</Link>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard r={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
