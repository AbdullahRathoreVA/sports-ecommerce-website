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
              "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
              !category ? "border-accent bg-accent text-accent-ink" : "hairline bg-surface hover:border-white/35",
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
                "inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors",
                category === c.slug ? "border-accent bg-accent text-accent-ink" : "hairline bg-surface hover:border-white/35",
              )}
            >
              {c.name} <span className="ml-1.5 font-mono text-xs opacity-60">{c.productCount}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[220px_1fr] lg:gap-12">
        <Suspense>
          <DesktopFilters />
        </Suspense>
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {results.length} {results.length === 1 ? "product" : "products"}
              {query.q ? <> for “{query.q}”</> : null}
            </p>
            <Suspense>
              <MobileFilters activeCount={activeCount} />
            </Suspense>
          </div>
          {results.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-4">
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
