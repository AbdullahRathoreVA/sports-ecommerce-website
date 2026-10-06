import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/catalog";
import { Catalog, type CatalogParams } from "@/components/product/catalog";
import { JsonLd, breadcrumbSchema } from "@/components/seo/json-ld";
import { CategoryView } from "@/components/analytics/category-view";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<CatalogParams> };

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) return {};
  return {
    title: cat.seoTitle ?? cat.name,
    description: cat.seoDesc ?? cat.description,
    alternates: { canonical: `/products/c/${cat.slug}` },
    openGraph: cat.image ? { images: [{ url: cat.image, alt: cat.imageAlt ?? cat.name }] } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const [{ category }, query] = await Promise.all([params, searchParams]);
  const cat = (await getCategories()).find((c) => c.slug === category);
  if (!cat) notFound();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Products", path: "/products" },
          { name: cat.name, path: `/products/c/${cat.slug}` },
        ])}
      />
      <CategoryView slug={cat.slug} />
      <PageHero
        eyebrow={`Products / ${cat.productCount} ${cat.productCount === 1 ? "product" : "products"}`}
        title={cat.name}
        intro={cat.description}
        image={cat.image ?? undefined}
        meta={[
          { label: "Custom", value: "Your branding" },
          { label: "Samples", value: "Before bulk" },
          { label: "Pricing", value: "Quantity breaks" },
          { label: "Made in", value: "Sialkot, Pakistan" },
        ]}
      />
      <div className="pt-8 lg:pt-12">
        <Catalog params={query} category={cat.slug} />
      </div>
    </>
  );
}
