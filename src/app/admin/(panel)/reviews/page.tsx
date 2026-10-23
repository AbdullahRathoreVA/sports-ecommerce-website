import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, StatTile } from "@/components/admin/ui";
import { getCategories } from "@/lib/catalog";
import { siteUrl } from "@/config/site";
import { cn } from "@/lib/utils";
import { medianModerationMinutes, reviewStats } from "@/lib/reviews/stats";
import { REVIEWABLE_ORDER_STATUSES } from "@/lib/reviews/invite";
import { AskForReview, ReviewBoard } from "./board";
import { InvitePanel, TemplatesPanel } from "./invites";

export const metadata: Metadata = { title: "Reviews" };

const TABS = [
  ["pending", "Waiting for you"],
  ["published", "On the website"],
  ["hidden", "Hidden"],
  ["rejected", "Rejected / spam"],
] as const;
type Tab = (typeof TABS)[number][0];

const WHERE = {
  pending: { pending: true, rejected: false },
  published: { published: true },
  hidden: { published: false, pending: false, rejected: false },
  rejected: { rejected: true },
} as const;

const fmtMinutes = (m: number | null) => (m == null ? "—" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} days`);

export default async function ReviewsAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdminPage("manageContent");
  const { tab: raw } = await searchParams;
  const base = { isDemo: false };
  const [counts, categories, all, invites, eligibleOrders] = await Promise.all([
    Promise.all((Object.keys(WHERE) as Tab[]).map((k) => db.testimonial.count({ where: { ...base, ...WHERE[k] } }))),
    getCategories(),
    db.testimonial.findMany({ where: base, select: { rating: true, productLine: true, verified: true, createdAt: true, published: true, approvedAt: true } }),
    db.reviewInvite.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { order: { select: { orderNumber: true } } } }),
    db.order.findMany({
      where: { isDemo: false, status: { in: [...REVIEWABLE_ORDER_STATUSES] }, reviewInvites: { none: {} }, customer: { reviewOptOut: false } },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, orderNumber: true, contactName: true, contactEmail: true, company: true, status: true, updatedAt: true, items: { select: { nameSnapshot: true }, take: 1 } },
    }),
  ]);
  const count = Object.fromEntries((Object.keys(WHERE) as Tab[]).map((k, i) => [k, counts[i]])) as Record<Tab, number>;
  const tab: Tab = TABS.some(([k]) => k === raw) ? (raw as Tab) : count.pending > 0 ? "pending" : "published";
  const rows = await db.testimonial.findMany({ where: { ...base, ...WHERE[tab] }, orderBy: [{ featured: "desc" }, { createdAt: "desc" }], include: { order: { select: { orderNumber: true } } } });

  // Private hint for the team: how many real orders the reviewer's email has (not proof of anything).
  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean) as string[])];
  const customers = emails.length ? await db.customer.findMany({ where: { email: { in: emails } }, select: { email: true, _count: { select: { orders: { where: { isDemo: false } } } } } }) : [];
  const ordersByEmail = new Map(customers.map((c) => [c.email, c._count.orders]));

  const stats = reviewStats(all);
  const created = invites.length;
  const opened = invites.filter((i) => i.clickedAt).length;
  const used = invites.filter((i) => i.usedAt).length;

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Real customer reviews for the website. New ones wait here until you publish them. Publish critical reviews too — buyers trust a mix. Reply publicly when it helps."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Published" value={`${stats.count}`} hint={stats.average != null ? `average ${stats.average.toFixed(1)} / 5` : "no ratings yet"} />
        <StatTile label="Verified buyers" value={stats.count ? `${Math.round((stats.verified / stats.count) * 100)}%` : "—"} hint={`${stats.verified} of ${stats.count} published`} />
        <StatTile label="Waiting / rejected" value={`${count.pending} / ${count.rejected}`} hint={`median time to publish: ${fmtMinutes(medianModerationMinutes(all))}`} />
        <StatTile label="Review requests" value={`${used} of ${created}`} hint={created ? `reviewed · ${opened} opened the link (${Math.round((used / created) * 100)}% answered)` : "none sent yet"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InvitePanel
          eligible={eligibleOrders.map((o) => ({ id: o.id, orderNumber: o.orderNumber, name: o.contactName, email: o.contactEmail, company: o.company ?? "", productLine: o.items[0]?.nameSnapshot ?? "", status: o.status, date: o.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }))}
          invites={invites.map((i) => ({
            id: i.id,
            name: i.name,
            email: i.email,
            orderNumber: i.order?.orderNumber ?? "",
            channel: i.channel,
            createdAt: i.createdAt.toISOString(),
            sentAt: i.sentAt?.toISOString() ?? "",
            sendStatus: i.sendStatus ?? "",
            clickedAt: i.clickedAt?.toISOString() ?? "",
            usedAt: i.usedAt?.toISOString() ?? "",
            expiresAt: i.expiresAt.toISOString(),
            optedOutAt: i.optedOutAt?.toISOString() ?? "",
          }))}
        />
        <div className="space-y-4">
          <AskForReview link={`${siteUrl}/reviews/new`} />
          <TemplatesPanel />
        </div>
      </div>

      <div className="mb-5 mt-8 flex flex-wrap gap-1.5">
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
          title: r.title ?? "",
          response: r.response ?? "",
          modNote: r.modNote ?? "",
          verified: r.verified,
          verifiedVia: r.verifiedVia ?? "",
          verifiedNote: r.verifiedNote ?? "",
          verifiedBy: r.verifiedBy ?? "",
          consentAt: r.consentAt?.toISOString() ?? "",
          featured: r.featured,
          published: r.published,
          pending: r.pending,
          rejected: r.rejected,
          spam: r.spam,
          rejectReason: r.rejectReason ?? "",
          customerOrders: r.email ? (ordersByEmail.get(r.email) ?? 0) : 0,
          orderNumber: r.order?.orderNumber ?? "",
          source: r.source,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
