import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/site/page-hero";
import { getCategories } from "@/lib/catalog";
import { db } from "@/lib/db";
import { hashInviteToken, inviteState, looksLikeToken } from "@/lib/reviews/invite";
import { ReviewForm, type InviteInfo } from "./form";

export const metadata: Metadata = {
  title: "Leave a review",
  description: "Ordered from Alrobel Sportswear? Tell other clubs and brands how it went.",
  alternates: { canonical: "/reviews/new" },
  robots: { index: false },
};

type SP = { name?: string; email?: string; company?: string; invite?: string };

export default async function NewReviewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const [categories, sp] = await Promise.all([getCategories(), searchParams]);
  let invite: InviteInfo = null;
  let inviteProblem: string | null = null;
  let prefill = { author: (sp.name ?? "").slice(0, 80), email: (sp.email ?? "").slice(0, 120), company: (sp.company ?? "").slice(0, 100), productLine: "" };

  if (sp.invite) {
    const row = looksLikeToken(sp.invite)
      ? await db.reviewInvite.findUnique({ where: { tokenHash: hashInviteToken(sp.invite) }, include: { order: { select: { orderNumber: true, company: true } } } }).catch(() => null)
      : null;
    const state = row ? inviteState(row) : "expired";
    if (row && state === "valid") {
      invite = { token: sp.invite, orderNumber: row.order?.orderNumber ?? null };
      prefill = { author: row.name, email: row.email, company: row.order?.company ?? "", productLine: row.productLine ?? "" };
      // Funnel: first time the invite link was opened (a real event, recorded once).
      if (!row.clickedAt) await db.reviewInvite.update({ where: { id: row.id }, data: { clickedAt: new Date() } }).catch(() => null);
    } else {
      inviteProblem = state === "used" ? "This review link has already been used — thank you for your feedback!" : state === "opted_out" ? "You asked us not to send review requests. You can still leave a review below if you'd like." : "This review link has expired. You can still leave a review below.";
    }
  }

  return (
    <>
      <PageHero eyebrow="Leave a review" title="How did we do?" intro="Your honest review — good or bad — helps other clubs, schools and brands choose with confidence. It takes two minutes." />
      <section className="container-x pb-28 pt-8 lg:pb-24">
        {inviteProblem && <p className="mx-auto mb-6 max-w-3xl rounded-[var(--radius-card)] bg-amber-500/10 p-4 text-sm ring-1 ring-amber-500/30">{inviteProblem}</p>}
        <ReviewForm productLines={categories.map((c) => c.name)} initial={prefill} invite={invite} />
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-subtle">
          Reviews are read by our team before they appear. <Link href="/reviews" className="underline">How reviews work</Link>
        </p>
      </section>
    </>
  );
}
