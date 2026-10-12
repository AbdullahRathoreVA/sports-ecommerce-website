import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "./settings-form";
import { CategoryEditor, CertEditor, FaqEditor, PostEditor, PurgeDemo } from "./editors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Content & settings" };

const TABS = [
  ["settings", "Site settings"],
  ["categories", "Categories"],
  ["faqs", "FAQs"],
  ["guides", "Buyer guides"],
  ["testimonials", "Testimonials"],
  ["certifications", "Certifications"],
  ["data", "Sample data"],
] as const;
type Tab = (typeof TABS)[number][0];

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await requireAdminPage("manageContent");
  const { tab: raw } = await searchParams;
  const tab: Tab = TABS.some(([k]) => k === raw) ? (raw as Tab) : "settings";

  let body: React.ReactNode = null;
  if (tab === "settings") {
    body = <SettingsForm initial={await getSettings()} />;
  } else if (tab === "categories") {
    const rows = await db.category.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } } });
    body = (
      <>
        <p className="mb-4 text-sm text-muted">The product lines shown on the home page and in the Products menu. Add a new line, change a photo, the wording or the order, hide a line — then add products to it.</p>
        <CategoryEditor
          items={rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, shortName: r.shortName ?? "", tagline: r.tagline ?? "", description: r.description, image: r.image ?? "", imageAlt: r.imageAlt ?? "", position: r.position, published: r.published, products: r._count.products }))}
        />
      </>
    );
  } else if (tab === "faqs") {
    const rows = await db.faq.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    body = <FaqEditor items={rows.map((r) => ({ id: r.id, question: r.question, answer: r.answer, topic: r.topic, position: r.position, published: r.published }))} />;
  } else if (tab === "guides") {
    const rows = await db.post.findMany({ orderBy: { createdAt: "desc" } });
    body = (
      <PostEditor
        items={rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, excerpt: r.excerpt, body: r.body, coverImage: r.coverImage ?? "", coverAlt: r.coverAlt ?? "", topic: r.topic, published: r.published, seoTitle: r.seoTitle ?? "", seoDesc: r.seoDesc ?? "" }))}
      />
    );
  } else if (tab === "testimonials") {
    body = (
      <p className="rounded-[var(--radius-card)] border hairline bg-surface p-6 text-sm text-muted">
        Client reviews now have their own page with approval, stars, photos and a link to send customers:{" "}
        <Link href="/admin/reviews" className="font-semibold text-accent hover:underline">Open Reviews →</Link>
      </p>
    );
  } else if (tab === "certifications") {
    const rows = await db.certification.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    body = (
      <>
        <p className="mb-4 text-sm text-muted">Buyers verify certificates with the issuer. Publish only ones the factory holds, with the certificate number.</p>
        <CertEditor items={rows.map((r) => ({ id: r.id, name: r.name, issuer: r.issuer ?? "", reference: r.reference ?? "", validUntil: r.validUntil ? r.validUntil.toISOString().slice(0, 10) : "", fileUrl: r.fileUrl ?? "", position: r.position, published: r.published }))} />
      </>
    );
  } else {
    const [orders, leads, customers, sessions] = await Promise.all([
      db.order.count({ where: { isDemo: true } }),
      db.lead.count({ where: { isDemo: true } }),
      db.customer.count({ where: { isDemo: true } }),
      db.session.count({ where: { isDemo: true } }),
    ]);
    body = <PurgeDemo counts={{ orders, leads, customers, sessions }} allowed={can(admin.role, "purgeDemoData")} />;
  }

  return (
    <>
      <PageHeader title="Content & settings" description="Brand, contact details and the words on the site. Saved changes appear on the live site within seconds." />
      <nav className="scrollbar-none -mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Content sections">
        {TABS.map(([k, label]) => (
          <Link key={k} href={k === "settings" ? "/admin/content" : `/admin/content?tab=${k}`} aria-current={tab === k ? "page" : undefined} className={cn("inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium", tab === k ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="max-w-4xl">{body}</div>
    </>
  );
}
