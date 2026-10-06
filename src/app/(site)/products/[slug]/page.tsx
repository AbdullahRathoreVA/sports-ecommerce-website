import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock, MapPin, Package, PackageCheck, Ruler } from "lucide-react";
import { getAllProducts, getProduct, getRelatedProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { ProductGallery } from "@/components/product/gallery";
import { MobileProductBar, PurchasePanel } from "@/components/product/purchase-panel";
import { ProductCard } from "@/components/product/product-card";
import { ProductTabs } from "@/components/product/product-tabs";
import { ProductView } from "@/components/analytics/category-view";
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

const heading = "font-[family-name:var(--font-logo)] font-extrabold uppercase";

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProduct(slug), getSettings()]);
  if (!product) notFound();
  const related = await getRelatedProducts(product, 4);
  const lead = leadTimeLabel(product.leadTimeMinDays, product.leadTimeMaxDays);
  const canBuy = product.purchaseMode !== "QUOTE" && product.priceTiers.length > 0;
  const isTeamwear = product.category.slug === "sublimation-teamwear";
  const shipsFrom = [settings.contact.city, settings.contact.country].filter(Boolean).join(", ") || "our factory";

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

      {/* Breadcrumb bar under the floating header, as in the reference layout. */}
      <nav aria-label="Breadcrumb" className="on-dark -mt-[calc(var(--header-h)+12px)] bg-ink pt-[calc(var(--header-h)+12px)]">
        <ol className="container-x flex flex-wrap items-center gap-1.5 py-4 text-[13px] text-white/55">
          <li>
            <Link href="/products" className="inline-flex items-center gap-1 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to Products
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li>
            <Link href={`/products/c/${product.category.slug}`} className="hover:text-white">
              {product.category.name}
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <li aria-current="page" className="truncate font-medium text-white">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="container-x grid gap-8 pt-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pt-12">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+20px)] lg:self-start">
          <div className="rounded-[var(--radius-card)] border hairline bg-surface p-2 sm:p-3">
            <ProductGallery images={product.images} name={product.name} />
          </div>
        </div>

        <div>
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-subtle">{product.sku}</span>
            <span className="rounded-sm border hairline bg-surface px-1.5 py-0.5 text-[11px] font-medium">{settings.brand.name}</span>
            <span className="label rounded-sm border hairline bg-surface px-1.5 py-0.5 text-[0.58rem] text-muted">{product.category.name}</span>
          </p>
          <h1 className={`${heading} mt-3 text-[clamp(1.9rem,4.6vw,2.8rem)] leading-[1.02] tracking-[-0.01em]`}>{product.name}</h1>
          {product.subtitle && <p className="mt-2 text-[17px] text-muted">{product.subtitle}</p>}
          <p className="mt-3 text-pretty text-[15px] leading-relaxed text-muted">{product.summary}</p>

          <div className="on-dark mt-6 rounded-[var(--radius-card)] bg-ink p-5 text-white">
            <p className="label text-white/50">Price</p>
            {product.fromCents != null ? (
              <p className="mt-1.5 text-2xl font-semibold tracking-tight">
                <span className="text-accent">From {formatMoney(product.fromCents, product.currency)}</span>
                <span className="text-base font-normal text-white/60"> / piece</span>
              </p>
            ) : (
              <p className="mt-1.5 text-2xl font-semibold uppercase tracking-tight text-accent">Price on request</p>
            )}
            <p className="mt-3 flex items-center gap-2 text-[13px] text-white/60">
              <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden /> Ships from {shipsFrom} · freight quoted on confirmation
            </p>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { icon: Package, label: "MOQ", value: `${product.moq} units` },
              { icon: Clock, label: "Lead time", value: lead ?? "On quote" },
              { icon: PackageCheck, label: "Sample", value: product.samplePriceCents != null ? formatMoney(product.samplePriceCents, product.currency) : "On request" },
              { icon: Ruler, label: "Sizes", value: product.sizes.length ? `${product.sizes.length} options` : "Made to order" },
            ].map((t) => (
              <div key={t.label} className="rounded-[var(--radius-card)] border hairline bg-surface p-3">
                <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-subtle">
                  <t.icon className="h-3.5 w-3.5 text-accent" aria-hidden /> {t.label}
                </dt>
                <dd className="mt-1.5 text-[15px] font-semibold">{t.value}</dd>
              </div>
            ))}
          </dl>

          {product.samplePriceCents != null && (
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-card)] border border-accent/25 bg-accent/[0.06] px-4 py-3 text-sm">
              <span className="font-semibold">Sampling</span>
              <span className="text-muted">Sample price: {formatMoney(product.samplePriceCents, product.currency)}</span>
              <span className="text-muted">Approve a sample before bulk production</span>
            </p>
          )}

          {product.customizations.length > 0 && (
            <div className="mt-6">
              <p className="label text-subtle">Customization</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {product.customizations.map((c) => (
                  <li key={c} className="rounded-sm border hairline bg-surface px-2.5 py-1.5 text-[13px]">
                    {c}
                  </li>
                ))}
              </ul>
              {isTeamwear && (
                <Link href="/design-studio" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline" data-track="customizer_start" data-track-label="Product page">
                  Try your design in the 3D Design Studio →
                </Link>
              )}
            </div>
          )}

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
            <Link
              href={`/contact?product=${product.slug}`}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-fg/80 text-[14px] font-semibold uppercase tracking-wide transition-colors hover:bg-fg hover:text-paper"
              data-track="cta_click"
              data-track-label="Product: Contact supplier"
            >
              Contact supplier
            </Link>
          </div>
        </div>
      </div>

      <div className="container-x mt-14 lg:mt-20">
        <ProductTabs
          tabs={[
            {
              id: "description",
              label: "Description",
              content: (
                <div className="max-w-3xl">
                  {product.description.split(/\n{2,}/).map((para, i) => (
                    <p key={i} className="mt-4 text-[16px] leading-relaxed text-muted first:mt-0">
                      {para}
                    </p>
                  ))}
                  {product.features.length > 0 && (
                    <>
                      <h3 className={`${heading} mt-8 text-lg`}>Key features</h3>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                        {product.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 rounded-[var(--radius-card)] border hairline bg-surface px-4 py-3 text-[15px]">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden /> {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ),
            },
            {
              id: "specs",
              label: "Specifications",
              content: (
                <div className="max-w-3xl space-y-8">
                  <div className="overflow-hidden rounded-[var(--radius-card)] border hairline bg-surface">
                    <table className="w-full text-left text-[15px]">
                      <thead className="on-dark bg-ink text-white">
                        <tr>
                          <th className="label px-4 py-3 text-[0.62rem]">Specification</th>
                          <th className="label px-4 py-3 text-[0.62rem]">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.specs.map((sp) => (
                          <tr key={sp.label} className="border-t hairline even:bg-surface-2">
                            <td className="w-[40%] px-4 py-3 font-medium">{sp.label}</td>
                            <td className="px-4 py-3 text-muted">{sp.value}</td>
                          </tr>
                        ))}
                        {product.materials.length > 0 && (
                          <tr className="border-t hairline">
                            <td className="px-4 py-3 font-medium">Materials</td>
                            <td className="px-4 py-3 text-muted">{product.materials.join(", ")}</td>
                          </tr>
                        )}
                        {product.sizes.length > 0 && (
                          <tr className="border-t hairline">
                            <td className="px-4 py-3 font-medium">Sizes</td>
                            <td className="px-4 py-3 text-muted">{product.sizes.join(" · ")}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {product.priceTiers.length > 1 && (
                    <div>
                      <h3 className={`${heading} text-lg`}>Bulk pricing</h3>
                      <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border hairline bg-surface">
                        <table className="w-full text-left text-[15px]">
                          <thead className="on-dark bg-ink text-white">
                            <tr>
                              <th className="label px-4 py-3 text-[0.62rem]">Quantity</th>
                              <th className="label px-4 py-3 text-[0.62rem]">Unit price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.priceTiers.map((t, i) => {
                              const nextMin = product.priceTiers[i + 1]?.minQty;
                              return (
                                <tr key={t.minQty} className="border-t hairline">
                                  <td className="px-4 py-3">{nextMin ? `${t.minQty}–${nextMin - 1}` : `${t.minQty}+`}</td>
                                  <td className="px-4 py-3 font-semibold">{formatMoney(t.unitCents, product.currency)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-xs text-subtle">Ex-works prices in {product.currency}. Freight quoted after confirmation.</p>
                    </div>
                  )}
                  <p className="text-xs text-subtle">Specifications are confirmed in writing with your quote and approval sample.</p>
                </div>
              ),
            },
            {
              id: "trade",
              label: "Trade & packaging",
              content: (
                <dl className="grid max-w-3xl gap-4 sm:grid-cols-2">
                  {[
                    { t: "Payment", d: settings.commerce.paymentMethods.map((m) => m.label).join(" or ") },
                    { t: "Shipping", d: settings.commerce.shippingNote },
                    { t: "Samples", d: settings.commerce.sampleNote },
                    { t: "Branding & packaging", d: "Custom logos, colours, designs, labels, tags and packaging under your brand." },
                  ].map((x) => (
                    <div key={x.t} className="rounded-[var(--radius-card)] border hairline bg-surface p-5">
                      <dt className="label text-accent">{x.t}</dt>
                      <dd className="mt-2 text-[15px] leading-relaxed text-muted">{x.d}</dd>
                    </div>
                  ))}
                </dl>
              ),
            },
          ]}
        />
      </div>

      {related.length > 0 && (
        <section className="container-x mt-16 pb-16 lg:mt-24 lg:pb-24" aria-labelledby="related">
          <p className="label text-subtle">More from {product.category.name}</p>
          <h2 id="related" className="font-display mt-4 text-[clamp(2rem,5vw,3rem)]">
            You may also like.
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
