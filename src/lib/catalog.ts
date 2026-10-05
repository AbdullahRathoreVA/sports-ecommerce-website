import "server-only";
import { unstable_cache } from "next/cache";
import { db, hasDatabase } from "@/lib/db";
import { fromPrice, normaliseTiers, type PriceTier } from "@/lib/pricing";

/**
 * Read-side catalogue access. Cached under the "catalog" tag; admin writes
 * expire the tag immediately. The catalogue is small (tens of products), so
 * search and filtering run in memory over the cached list — fast, and no
 * extra round-trips per keystroke.
 */

export const CATALOG_TAG = "catalog";
export const CONTENT_TAG = "content";

export type ProductCard = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  subtitle: string | null;
  summary: string;
  category: { slug: string; name: string };
  purchaseMode: "QUOTE" | "CART" | "BOTH";
  currency: string;
  fromCents: number | null;
  samplePriceCents: number | null;
  moq: number;
  leadTimeMinDays: number | null;
  leadTimeMaxDays: number | null;
  featured: boolean;
  image: { url: string; alt: string; width: number | null; height: number | null; source: string } | null;
  hoverImage: { url: string; alt: string } | null;
  tags: string[];
  useCases: string[];
  materials: string[];
  customizations: string[];
  position: number;
  createdAt: string;
};

export type ProductDetail = ProductCard & {
  description: string;
  priceTiers: PriceTier[];
  specs: { label: string; value: string }[];
  features: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  images: { url: string; alt: string; width: number | null; height: number | null; source: string }[];
  videoUrl: string | null;
  specSheetUrl: string | null;
  seoTitle: string | null;
  seoDesc: string | null;
  isDemo: boolean;
  updatedAt: string;
};

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  tagline: string | null;
  description: string;
  image: string | null;
  imageAlt: string | null;
  productCount: number;
  seoTitle: string | null;
  seoDesc: string | null;
};

const productInclude = {
  category: { select: { slug: true, name: true } },
  images: { orderBy: { position: "asc" as const } },
};

type ProductRow = Awaited<ReturnType<typeof loadProductRows>>[number];

async function loadProductRows() {
  return db.product.findMany({
    where: { status: "ACTIVE", category: { published: true } },
    include: productInclude,
    orderBy: [{ featured: "desc" }, { position: "asc" }],
  });
}

function toCard(p: ProductRow): ProductCard {
  const tiers = normaliseTiers(p.priceTiers);
  const first = p.images[0];
  const second = p.images[1];
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    subtitle: p.subtitle,
    summary: p.summary,
    category: p.category,
    purchaseMode: p.purchaseMode,
    currency: p.currency,
    fromCents: fromPrice(tiers) ?? p.priceCents,
    samplePriceCents: p.samplePriceCents,
    moq: p.moq,
    leadTimeMinDays: p.leadTimeMinDays,
    leadTimeMaxDays: p.leadTimeMaxDays,
    featured: p.featured,
    image: first ? { url: first.url, alt: first.alt, width: first.width, height: first.height, source: first.source } : null,
    hoverImage: second ? { url: second.url, alt: second.alt } : null,
    tags: p.tags,
    useCases: p.useCases,
    materials: p.materials,
    customizations: p.customizations,
    position: p.position,
    createdAt: p.createdAt.toISOString(),
  };
}

function toDetail(p: ProductRow): ProductDetail {
  return {
    ...toCard(p),
    description: p.description,
    priceTiers: normaliseTiers(p.priceTiers),
    specs: Array.isArray(p.specs) ? (p.specs as ProductDetail["specs"]) : [],
    features: p.features,
    sizes: p.sizes,
    colors: Array.isArray(p.colors) ? (p.colors as ProductDetail["colors"]) : [],
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height, source: i.source })),
    videoUrl: p.videoUrl,
    specSheetUrl: p.specSheetUrl,
    seoTitle: p.seoTitle,
    seoDesc: p.seoDesc,
    isDemo: p.isDemo,
    updatedAt: p.updatedAt.toISOString(),
  };
}

const getAllProductRows = unstable_cache(
  async () => {
    if (!hasDatabase()) return [] as ProductDetail[];
    try {
      return (await loadProductRows()).map(toDetail);
    } catch (error) {
      console.error("[catalog] products unavailable", error);
      return [] as ProductDetail[];
    }
  },
  ["catalog-products"],
  { tags: [CATALOG_TAG], revalidate: 600 },
);

export async function getAllProducts(): Promise<ProductDetail[]> {
  return getAllProductRows();
}

export const getCategories = unstable_cache(
  async (): Promise<CategorySummary[]> => {
    if (!hasDatabase()) return [];
    try {
      const rows = await db.category.findMany({
        where: { published: true },
        orderBy: { position: "asc" },
        include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
      });
      // Only categories that actually contain products — no dead-end filters.
      return rows
        .filter((c) => c._count.products > 0)
        .map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          shortName: c.shortName,
          tagline: c.tagline,
          description: c.description,
          image: c.image,
          imageAlt: c.imageAlt,
          productCount: c._count.products,
          seoTitle: c.seoTitle,
          seoDesc: c.seoDesc,
        }));
    } catch (error) {
      console.error("[catalog] categories unavailable", error);
      return [];
    }
  },
  ["catalog-categories"],
  { tags: [CATALOG_TAG], revalidate: 600 },
);

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  const all = await getAllProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

export type ProductQuery = {
  q?: string;
  category?: string;
  mode?: "buy" | "quote" | "";
  sort?: "featured" | "price-asc" | "price-desc" | "newest" | "moq";
  useCase?: string;
};

/** Token-scored search across name, tags, category, materials and summary. */
export function searchProducts(products: ProductDetail[], query: ProductQuery): ProductDetail[] {
  let list = products;
  if (query.category) list = list.filter((p) => p.category.slug === query.category);
  if (query.mode === "buy") list = list.filter((p) => p.purchaseMode !== "QUOTE");
  if (query.mode === "quote") list = list.filter((p) => p.purchaseMode !== "CART");
  if (query.useCase) list = list.filter((p) => p.useCases.includes(query.useCase!));

  const q = query.q?.trim().toLowerCase();
  if (q) {
    const terms = q.split(/\s+/).filter((t) => t.length > 1);
    const scored = list
      .map((p) => {
        const hay = {
          name: p.name.toLowerCase(),
          tags: p.tags.join(" ").toLowerCase(),
          category: p.category.name.toLowerCase(),
          rest: [p.summary, p.subtitle ?? "", p.materials.join(" "), p.customizations.join(" "), p.sku].join(" ").toLowerCase(),
        };
        let score = 0;
        for (const t of terms) {
          if (hay.name.includes(t)) score += 5;
          if (hay.tags.includes(t)) score += 4;
          if (hay.category.includes(t)) score += 3;
          if (hay.rest.includes(t)) score += 1;
        }
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    list = scored.map((x) => x.p);
    if (!query.sort || query.sort === "featured") return list;
  }

  const sorted = [...list];
  switch (query.sort) {
    case "price-asc":
      sorted.sort((a, b) => (a.fromCents ?? Infinity) - (b.fromCents ?? Infinity));
      break;
    case "price-desc":
      sorted.sort((a, b) => (b.fromCents ?? -1) - (a.fromCents ?? -1));
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "moq":
      sorted.sort((a, b) => a.moq - b.moq);
      break;
    default:
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || a.position - b.position);
  }
  return sorted;
}

export async function getRelatedProducts(product: ProductDetail, limit = 4): Promise<ProductDetail[]> {
  const all = await getAllProducts();
  const same = all.filter((p) => p.id !== product.id && p.category.slug === product.category.slug);
  const other = all.filter(
    (p) => p.id !== product.id && p.category.slug !== product.category.slug && p.useCases.some((u) => product.useCases.includes(u)),
  );
  return [...same, ...other].slice(0, limit);
}

export const getFaqs = unstable_cache(
  async () => {
    if (!hasDatabase()) return [];
    try {
      return await db.faq.findMany({ where: { published: true }, orderBy: { position: "asc" } });
    } catch {
      return [];
    }
  },
  ["content-faqs"],
  { tags: [CONTENT_TAG], revalidate: 600 },
);

export const getPosts = unstable_cache(
  async () => {
    if (!hasDatabase()) return [];
    try {
      return await db.post.findMany({
        where: { published: true },
        orderBy: { publishedAt: "desc" },
        select: { slug: true, title: true, excerpt: true, coverImage: true, coverAlt: true, topic: true, publishedAt: true, updatedAt: true },
      });
    } catch {
      return [];
    }
  },
  ["content-posts"],
  { tags: [CONTENT_TAG], revalidate: 600 },
);

export async function getPost(slug: string) {
  if (!hasDatabase()) return null;
  return unstable_cache(
    async () => {
      try {
        return await db.post.findFirst({ where: { slug, published: true } });
      } catch {
        return null;
      }
    },
    ["content-post", slug],
    { tags: [CONTENT_TAG], revalidate: 600 },
  )();
}

export const getPublishedTestimonials = unstable_cache(
  async () => {
    if (!hasDatabase()) return [];
    try {
      return await db.testimonial.findMany({ where: { published: true }, orderBy: { position: "asc" } });
    } catch {
      return [];
    }
  },
  ["content-testimonials"],
  { tags: [CONTENT_TAG], revalidate: 600 },
);

export const getPublishedCertifications = unstable_cache(
  async () => {
    if (!hasDatabase()) return [];
    try {
      return await db.certification.findMany({ where: { published: true }, orderBy: { position: "asc" } });
    } catch {
      return [];
    }
  },
  ["content-certifications"],
  { tags: [CONTENT_TAG], revalidate: 600 },
);
