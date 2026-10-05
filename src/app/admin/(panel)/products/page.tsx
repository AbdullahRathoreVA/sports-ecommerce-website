import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Plus, Star } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, Badge, humanise, Empty, th, td } from "@/components/admin/ui";
import { cn, formatMoney, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Products" };

const STATUSES = ["ALL", "ACTIVE", "DRAFT", "ARCHIVED"] as const;
const STATUS_TONE = { ACTIVE: "good", DRAFT: "warn", ARCHIVED: "neutral" } as const;

type SP = { status?: string; category?: string; q?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdminPage("manageProducts");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as (typeof STATUSES)[number]) ? sp.status! : "ALL";
  const q = sp.q?.trim().slice(0, 80) ?? "";
  const base: Prisma.ProductWhereInput = {
    ...(sp.category ? { categoryId: sp.category } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [products, categories, counts] = await Promise.all([
    db.product.findMany({
      where: { ...base, ...(status !== "ALL" ? { status: status as "ACTIVE" } : {}) },
      orderBy: [{ category: { position: "asc" } }, { position: "asc" }, { name: "asc" }],
      include: { category: { select: { name: true } }, images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    db.product.groupBy({ by: ["status"], _count: true, where: base }),
  ]);
  const countOf = (s: string) => (s === "ALL" ? counts.reduce((n, c) => n + c._count, 0) : counts.find((c) => c.status === s)?._count ?? 0);
  const href = (patch: Partial<SP>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/admin/products${p.toString() ? `?${p}` : ""}`;
  };
  const placeholders = products.filter((p) => p.isDemo).length;

  return (
    <>
      <PageHeader title="Products" description="Everything in the catalogue. Changes go live on the site as soon as you save.">
        <Link href="/admin/products/new" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-accent-ink">
          <Plus className="h-4 w-4" aria-hidden /> New product
        </Link>
      </PageHeader>
      {placeholders > 0 && (
        <p className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3 text-sm text-amber-100">
          {placeholders} product{placeholders === 1 ? "" : "s"} still use{placeholders === 1 ? "s" : ""} starter content (placeholder photos, indicative prices). Open each one, add real factory photos and confirm prices, MOQs and lead times.
        </p>
      )}
      <div className="scrollbar-none -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s === "ALL" ? undefined : s })} className={cn("inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium", status === s ? "border-white bg-white text-ink" : "hairline text-muted hover:text-fg")}>
            {s === "ALL" ? "All" : humanise(s)} <span className="font-mono text-xs opacity-60">{countOf(s)}</span>
          </Link>
        ))}
      </div>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        {status !== "ALL" && <input type="hidden" name="status" value={status} />}
        <label htmlFor="pq" className="sr-only">Search products</label>
        <input id="pq" name="q" defaultValue={q} placeholder="Search name or SKU" className="h-11 w-full max-w-xs rounded-[var(--radius-control)] border hairline bg-surface px-3.5 text-[15px] outline-none focus:border-accent" />
        <label htmlFor="pc" className="sr-only">Category</label>
        <select id="pc" name="category" defaultValue={sp.category ?? ""} className="h-11 rounded-[var(--radius-control)] border hairline bg-surface px-3 text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="h-11 rounded-[var(--radius-control)] bg-white px-4 text-sm font-semibold text-ink">Filter</button>
      </form>

      {products.length === 0 ? (
        <Empty title="No products match" body="Try another filter, or add a new product." />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border hairline bg-surface">
          <table className="w-full min-w-[820px]">
            <thead className="border-b hairline">
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Category</th>
                <th className={th}>Sold as</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} text-right`}>MOQ</th>
                <th className={th}>Status</th>
                <th className={th}>Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hairline last:border-0 hover:bg-white/[0.02]">
                  <td className={td}>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="relative aspect-[4/5] w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
                        {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 font-medium text-fg hover:text-accent">
                          {p.name}
                          {p.featured && <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-label="Featured" />}
                        </span>
                        <span className="block font-mono text-xs text-subtle">{p.sku}</span>
                      </span>
                    </Link>
                  </td>
                  <td className={`${td} text-muted`}>{p.category.name}</td>
                  <td className={`${td} text-muted`}>{p.purchaseMode === "QUOTE" ? "Quote only" : p.purchaseMode === "CART" ? "Buy online" : "Sample + quote"}</td>
                  <td className={`${td} text-right tabular-nums`}>{p.priceCents != null ? formatMoney(p.priceCents, p.currency) : <span className="text-subtle">On request</span>}</td>
                  <td className={`${td} text-right tabular-nums`}>{p.moq}</td>
                  <td className={td}>
                    <Badge tone={STATUS_TONE[p.status]}>{humanise(p.status)}</Badge>
                    {p.isDemo && <Badge className="ml-1.5">starter</Badge>}
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{timeAgo(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
