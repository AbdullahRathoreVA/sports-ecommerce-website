import Link from "next/link";
import { Suspense } from "react";
import { getAllProducts, getCategories, searchProducts, type ProductQuery } from "@/lib/catalog";
import { ProductCard } from "./product-card";
import { CatalogSearch, DesktopFilters, MobileFilters } from "./catalog-controls";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";

export type CatalogParams = { q?: string; mode?: string; sort?: string; use?: string };

/** Shared listing for /products and /products/c/[category]. Server-rendered from URL state. */
export async function Catalog({ params, category }: { params: CatalogParams; category?: string }) {
  const [all, categories] = await Promise.all([getAllProducts(), getCategories()]);
  const query: ProductQuery = {
    q: params.q?.slice(0, 80),
    category,
    mode: params.mode === "buy" || params.mode === "quote" ? params.mode : "",
    sort: (["featured", "price-asc", "price-desc", "newest", "moq"] as const).find((s) => s === params.sort) ?? "featured",
    useCase: params.use?.slice(0, 30),
  };
  const results = searchProducts(all, query);
  const activeCount = [query.mode, query.useCase, params.sort && params.sort !== "featured" ? params.sort : ""].filter(Boolean).length;
  const carry = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && k !== "focus") as [string, string][]).toString();

  return (
    <div className="container-x pb-20">
      <div className="sticky top-[var(--header-h)] z-30 -mx-4 border-b hairline bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <Suspense>
          <CatalogSearch />
        </Suspense>
        <nav aria-label="Categories" className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-5 lg:flex-wrap lg:px-0">
          <Link
            href={`/products${carry ? `?${carry}` : ""}`}
            aria-current={!category ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-md border px-4 text-[13px] font-semibold transition-colors",
              !category ? "border-ink bg-ink text-white" : "hairline bg-surface hover:border-fg/40",
            )}
          >
            All <span className="ml-1.5 font-mono text-xs opacity-60">{all.length}</span>
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/products/c/${c.slug}${carry ? `?${carry}` : ""}`}
              aria-current={category === c.slug ? "page" : undefined}
              data-track="category_view"
              data-category={c.slug}
              className={cn(
                "inline-flex h-10 shrink-0 items-center rounded-md border px-4 text-[13px] font-semibold transition-colors",
                category === c.slug ? "border-ink bg-ink text-white" : "hairline bg-surface hover:border-fg/40",
              )}
            >
              {c.name} <span className="ml-1.5 font-mono text-xs opacity-60">{c.productCount}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[260px_1fr] lg:gap-8">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-[calc(var(--header-h)+24px)] space-y-5">
            <Suspense>
              <DesktopFilters />
            </Suspense>
            <div className="on-dark rounded-[var(--radius-card)] bg-ink p-5 text-white">
              <p className="label text-accent">Need a bulk quote?</p>
              <p className="mt-3 text-xl font-semibold leading-tight tracking-tight">Get custom pricing fast</p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60">Share your target quantity and customisation. We reply with a written quote.</p>
              <ButtonLink href="/quote" size="sm" className="mt-5 w-full" data-track="quote_start" data-track-label="Catalog sidebar">
                Request Quote
              </ButtonLink>
              <ButtonLink href="/contact" size="sm" variant="outline-light" className="mt-2 w-full">
                Talk to Sales
              </ButtonLink>
            </div>
          </div>
        </aside>
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              Showing {results.length} {results.length === 1 ? "product" : "products"}
              {query.q ? <> for “{query.q}”</> : null}
            </p>
            <Suspense>
              <MobileFilters activeCount={activeCount} />
            </Suspense>
          </div>
          {results.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {results.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} priority={i < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[var(--radius-card)] border hairline bg-surface p-8 text-center sm:p-12">
              <p className="text-lg font-semibold">Nothing matches that — yet.</p>
              <p className="mx-auto mt-2 max-w-md text-muted">
                We manufacture to specification, so if you can describe it, we can probably make it. Send us your requirements and we&apos;ll
                come back with options.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink href={`/quote${query.q ? `?product=${encodeURIComponent(query.q)}` : ""}`} data-track="quote_start" data-track-label="Empty search">
                  Request a custom quote
                </ButtonLink>
                <ButtonLink href="/products" variant="outline">
                  Clear filters
                </ButtonLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
