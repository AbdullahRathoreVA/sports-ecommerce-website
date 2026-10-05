import type { Metadata } from "next";
import Image from "next/image";
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
      <header className="on-dark relative overflow-hidden bg-ink text-white">
        {cat.image && (
          <Image src={cat.image} alt="" fill priority sizes="100vw" className="object-cover opacity-35" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
        <div className="container-x relative py-12 lg:py-20">
          <p className="eyebrow text-accent">{cat.productCount} products</p>
          <h1 className="font-display mt-3 max-w-3xl text-[clamp(2.6rem,9vw,5.2rem)]">{cat.name}</h1>
          <p className="mt-4 max-w-2xl text-pretty text-white/75">{cat.description}</p>
        </div>
      </header>
      <div className="pt-6 lg:pt-10">
        <Catalog params={query} category={cat.slug} />
      </div>
    </>
  );
}
