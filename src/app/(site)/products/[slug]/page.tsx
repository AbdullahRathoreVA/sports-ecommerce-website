import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, Factory, Layers, PackageCheck, Ruler } from "lucide-react";
import { getAllProducts, getProduct, getRelatedProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { ProductGallery } from "@/components/product/gallery";
import { MobileProductBar, PurchasePanel } from "@/components/product/purchase-panel";
import { ProductCard } from "@/components/product/product-card";
import { ProductView } from "@/components/analytics/category-view";
import { FilmButton, SHORT_FILM } from "@/components/media/film-player";
import { JsonLd, breadcrumbSchema, productSchema } from "@/components/seo/json-ld";
import { formatMoney, leadTimeLabel } from "@/lib/utils";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getAllProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const title = p.seoTitle ?? p.name;
  const description = p.seoDesc ?? p.summary;
  return {
    title,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: p.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt, width: i.width ?? undefined, height: i.height ?? undefined })),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 4);
  const lead = leadTimeLabel(product.leadTimeMinDays, product.leadTimeMaxDays);
  const canBuy = product.purchaseMode !== "QUOTE" && product.priceTiers.length > 0;
  const isTeamwear = product.category.slug === "sublimation-teamwear";

  return (
    <div className="pb-24 lg:pb-0">
      <JsonLd
        data={[
          productSchema(product, settings.brand.name),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Products", path: "/products" },
            { name: product.category.name, path: `/products/c/${product.category.slug}` },
            { name: product.name, path: `/products/${product.slug}` },
          ]),
        ]}
      />
      <ProductView productId={product.id} category={product.category.slug} name={product.name} />

      <nav aria-label="Breadcrumb" className="container-x py-4">
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-subtle">
          <li>
            <Link href="/products" className="hover:text-fg">
              Products
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li>
            <Link href={`/products/c/${product.category.slug}`} className="hover:text-fg">
              {product.category.name}
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li aria-current="page" className="truncate text-fg">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="container-x grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <ProductGallery images={product.images} name={product.name} />

        <div className="lg:sticky lg:top-[calc(var(--header-h)+20px)] lg:self-start">
          <p className="font-mono text-xs uppercase tracking-wider text-subtle">
            {product.category.name} · {product.sku}
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,5vw,2.6rem)] font-semibold leading-[1.08] tracking-tight">{product.name}</h1>
          {product.subtitle && <p className="mt-2 text-lg text-muted">{product.subtitle}</p>}

          <dl className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-chalk p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <Layers className="h-3.5 w-3.5" aria-hidden /> Min. order
              </dt>
              <dd className="mt-1 font-semibold">{product.moq} units</dd>
            </div>
            <div className="rounded-xl bg-chalk p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <Clock className="h-3.5 w-3.5" aria-hidden /> Lead time
              </dt>
              <dd className="mt-1 font-semibold">{lead ?? "On quote"}</dd>
            </div>
            <div className="rounded-xl bg-chalk p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted">
                <PackageCheck className="h-3.5 w-3.5" aria-hidden /> Samples
              </dt>
              <dd className="mt-1 font-semibold">{product.samplePriceCents != null ? formatMoney(product.samplePriceCents, product.currency) : "On request"}</dd>
            </div>
          </dl>

          <p className="mt-5 text-pretty text-[16px] leading-relaxed text-muted">{product.summary}</p>

          <div id="buy" className="mt-6 scroll-mt-24">
            <PurchasePanel
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                sku: product.sku,
                image: product.image?.url ?? null,
                purchaseMode: product.purchaseMode,
                currency: product.currency,
                priceTiers: product.priceTiers,
                samplePriceCents: product.samplePriceCents,
                moq: product.moq,
                sizes: product.sizes,
                category: product.category.slug,
              }}
              whatsapp={settings.contact.whatsapp}
            />
          </div>

          {product.priceTiers.length > 1 && (
            <div className="mt-6">
              <p className="text-sm font-semibold">Bulk pricing</p>
              <table className="mt-2 w-full overflow-hidden rounded-xl text-left text-sm ring-1 ring-white/10">
                <thead className="bg-chalk text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Quantity</th>
                    <th className="px-4 py-2.5 font-medium">Unit price</th>
                  </tr>
                </thead>
                <tbody>
                  {product.priceTiers.map((t, i) => {
                    const nextMin = product.priceTiers[i + 1]?.minQty;
                    return (
                      <tr key={t.minQty} className="border-t hairline">
                        <td className="px-4 py-2.5">{nextMin ? `${t.minQty}–${nextMin - 1}` : `${t.minQty}+`}</td>
                        <td className="px-4 py-2.5 font-semibold">{formatMoney(t.unitCents, product.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-subtle">Ex-works prices in {product.currency}. Freight quoted after confirmation.</p>
            </div>
          )}
        </div>
      </div>

      <div className="container-x mt-14 grid gap-10 lg:mt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <section aria-labelledby="about-product">
          <h2 id="about-product" className="text-2xl font-semibold tracking-tight">
            About this product
          </h2>
          {product.description.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="mt-4 text-[16px] leading-relaxed text-muted">
              {para}
            </p>
          ))}
          {product.features.length > 0 && (
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-2 rounded-xl bg-chalk px-4 py-3 text-[15px]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          )}

          {product.customizations.length > 0 && (
            <div className="mt-10">
              <h3 className="text-lg font-semibold">Make it yours</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.customizations.map((c) => (
                  <li key={c} className="rounded-full border hairline bg-surface px-3.5 py-2 text-sm">
                    {c}
                  </li>
                ))}
              </ul>
              {isTeamwear && (
                <Link href="/design-studio" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline" data-track="customizer_start" data-track-label="Product page">
                  Try your design in the 3D Design Studio →
                </Link>
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="specs">
          <h2 id="specs" className="text-2xl font-semibold tracking-tight">
            Specifications
          </h2>
          <dl className="mt-4 divide-y hairline overflow-hidden rounded-[var(--radius-card)] border hairline bg-surface">
            {product.specs.map((s) => (
              <div key={s.label} className="grid grid-cols-[minmax(110px,40%)_1fr] gap-4 px-4 py-3.5 text-[15px]">
                <dt className="text-muted">{s.label}</dt>
                <dd className="font-medium">{s.value}</dd>
              </div>
            ))}
            {product.materials.length > 0 && (
              <div className="grid grid-cols-[minmax(110px,40%)_1fr] gap-4 px-4 py-3.5 text-[15px]">
                <dt className="text-muted">Materials</dt>
                <dd className="font-medium">{product.materials.join(", ")}</dd>
              </div>
            )}
            {product.sizes.length > 0 && (
              <div className="grid grid-cols-[minmax(110px,40%)_1fr] gap-4 px-4 py-3.5 text-[15px]">
                <dt className="flex items-center gap-1.5 text-muted">
                  <Ruler className="h-4 w-4" aria-hidden /> Sizes
                </dt>
                <dd className="font-medium">{product.sizes.join(" · ")}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-subtle">Specifications are confirmed in writing with your quote and approval sample.</p>

          <div className="on-dark mt-8 flex flex-col gap-4 rounded-[var(--radius-card)] bg-ink p-6 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Factory className="h-4 w-4 text-accent" aria-hidden /> Made in our own factory
            </p>
            <p className="text-sm text-white/65">Printed, cut, stitched and checked under one roof — see it for yourself.</p>
            <FilmButton film={SHORT_FILM} />
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section className="container-x mt-16 pb-16 lg:mt-24 lg:pb-24" aria-labelledby="related">
          <h2 id="related" className="font-display text-[clamp(2rem,6vw,3.2rem)]">
            Pairs well with
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <MobileProductBar name={product.name} fromCents={product.fromCents} currency={product.currency} canBuy={canBuy} slug={product.slug} />
    </div>
  );
}
