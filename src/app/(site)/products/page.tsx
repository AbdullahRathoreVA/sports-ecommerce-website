import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { Catalog, type CatalogParams } from "@/components/product/catalog";
import { JsonLd, breadcrumbSchema } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Products — Team Kits, Uniforms, Sportswear & Gloves",
  description:
    "Browse factory-direct sublimated team kits, tracksuits, hoodies, gym wear and American football gloves, made to order with your logo. Samples available; bulk pricing by quantity.",
  alternates: { canonical: "/products" },
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<CatalogParams> }) {
  const params = await searchParams;
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }])} />
      <PageHero
        eyebrow="The product collection / Alrobel Sportswear"
        title="Our Products"
        intro="Every product is made in our own factory in Sialkot. Buy a sample or a small run online, or request a quote for bulk, custom and private-label orders."
        meta={[
          { label: "MOQ ready", value: "Bulk supply" },
          { label: "Custom", value: "Branding & OEM" },
          { label: "Samples", value: "Before bulk" },
          { label: "Made in", value: "Sialkot, Pakistan" },
        ]}
      />
      <div className="pt-8 lg:pt-12">
        <Catalog params={params} />
      </div>
    </>
  );
}
