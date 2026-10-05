import type { Metadata } from "next";
import { Catalog, type CatalogParams } from "@/components/product/catalog";
import { JsonLd, breadcrumbSchema } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Products — Teamwear, Racing Suits, Leather Jackets & Gloves",
  description:
    "Browse factory-direct sublimated teamwear, motorbike and kart racing suits, leather jackets, American football gloves and sportswear. Samples available; bulk pricing by quantity.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }])} />
      <header className="container-x pb-6 pt-10 lg:pb-8 lg:pt-14">
        <p className="eyebrow text-accent">Catalogue</p>
        <h1 className="font-display mt-3 text-[clamp(2.6rem,9vw,5rem)]">All products</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Every product is made in our own factory. Buy a sample or a small run online, or request a quote for bulk, custom and private-label
          orders.
        </p>
      </header>
      <Catalog params={params} />
    </>
  );
}
