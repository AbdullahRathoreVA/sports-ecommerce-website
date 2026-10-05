import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { normaliseTiers } from "@/lib/pricing";
import { ProductForm, type ProductFormValue } from "./product-form";

export const metadata: Metadata = { title: "Edit product" };

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("manageProducts");
  const { id } = await params;
  const isNew = id === "new";
  const [product, categories] = await Promise.all([
    isNew ? null : db.product.findUnique({ where: { id }, include: { images: { orderBy: { position: "asc" } }, _count: { select: { orderItems: true, leads: true } } } }),
    db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!isNew && !product) notFound();

  const value: ProductFormValue = product
    ? {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        subtitle: product.subtitle ?? "",
        categoryId: product.categoryId,
        summary: product.summary,
        description: product.description,
        status: product.status,
        featured: product.featured,
        isDemo: product.isDemo,
        position: product.position,
        purchaseMode: product.purchaseMode,
        currency: product.currency,
        priceCents: product.priceCents,
        salePriceCents: product.salePriceCents,
        samplePriceCents: product.samplePriceCents,
        priceTiers: normaliseTiers(product.priceTiers),
        moq: product.moq,
        stock: product.stock,
        leadTimeMinDays: product.leadTimeMinDays,
        leadTimeMaxDays: product.leadTimeMaxDays,
        specs: Array.isArray(product.specs) ? (product.specs as { label: string; value: string }[]) : [],
        materials: strings(product.materials),
        customizations: strings(product.customizations),
        features: strings(product.features),
        sizes: strings(product.sizes),
        tags: strings(product.tags),
        useCases: strings(product.useCases),
        colors: Array.isArray(product.colors) ? (product.colors as { name: string; hex: string }[]) : [],
        videoUrl: product.videoUrl ?? "",
        specSheetUrl: product.specSheetUrl ?? "",
        seoTitle: product.seoTitle ?? "",
        seoDesc: product.seoDesc ?? "",
        images: product.images.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height, source: i.source === "placeholder" ? "placeholder" : "client" })),
      }
    : {
        name: "",
        slug: "",
        sku: "",
        subtitle: "",
        categoryId: categories[0]?.id ?? "",
        summary: "",
        description: "",
        status: "DRAFT",
        featured: false,
        isDemo: false,
        position: 0,
        purchaseMode: "QUOTE",
        currency: "USD",
        priceCents: null,
        salePriceCents: null,
        samplePriceCents: null,
        priceTiers: [],
        moq: 50,
        stock: null,
        leadTimeMinDays: null,
        leadTimeMaxDays: null,
        specs: [],
        materials: [],
        customizations: [],
        features: [],
        sizes: [],
        tags: [],
        useCases: [],
        colors: [],
        videoUrl: "",
        specSheetUrl: "",
        seoTitle: "",
        seoDesc: "",
        images: [],
      };

  return (
    <>
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All products
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{product ? product.name : "New product"}</h1>
        {product?.status === "ACTIVE" && (
          <a href={`/products/${product.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
            View on site <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
      {product?.isDemo && (
        <p className="mb-5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3 text-sm text-amber-100">
          Starter content: photos marked &ldquo;placeholder&rdquo; are generated stand-ins, and prices, MOQ and lead times are indicative. Replace them with the factory&apos;s real figures before launch.
        </p>
      )}
      <ProductForm id={product?.id ?? null} initial={value} categories={categories} usage={product ? { orders: product._count.orderItems, leads: product._count.leads } : null} />
    </>
  );
}
