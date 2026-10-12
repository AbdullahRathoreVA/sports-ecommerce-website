import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { getCategories } from "@/lib/catalog";
import { ReviewForm } from "./form";

export const metadata: Metadata = {
  title: "Leave a review",
  description: "Ordered from Alrobel Sportswear? Tell other clubs and brands how it went.",
  alternates: { canonical: "/reviews/new" },
  robots: { index: false },
};

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<{ name?: string; email?: string; company?: string }> }) {
  const [categories, sp] = await Promise.all([getCategories(), searchParams]);
  return (
    <>
      <PageHero eyebrow="Leave a review" title="How did we do?" intro="Your honest review helps other clubs, schools and brands choose with confidence. It takes two minutes." />
      <section className="container-x pb-28 pt-8 lg:pb-24">
        <ReviewForm
          productLines={categories.map((c) => c.name)}
          initial={{ author: (sp.name ?? "").slice(0, 80), email: (sp.email ?? "").slice(0, 120), company: (sp.company ?? "").slice(0, 100) }}
        />
      </section>
    </>
  );
}
