import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";
import { getAllProducts, getCategories, getPosts } from "@/lib/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, posts] = await Promise.all([getAllProducts(), getCategories(), getPosts()]);
  const now = new Date();
  const pages = ["", "/products", "/design-studio", "/oem", "/factory", "/industries", "/about", "/insights", "/quote", "/contact"];
  return [
    ...pages.map((p) => ({ url: `${siteUrl}${p}`, lastModified: now, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...categories.map((c) => ({ url: `${siteUrl}/products/c/${c.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${siteUrl}/products/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...posts.map((p) => ({ url: `${siteUrl}/insights/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: `${siteUrl}/privacy`, lastModified: now, priority: 0.2 },
    { url: `${siteUrl}/terms`, lastModified: now, priority: 0.2 },
  ];
}
