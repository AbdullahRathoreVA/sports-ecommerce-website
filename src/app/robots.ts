import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

/**
 * The demo must not be indexed: it carries a placeholder brand and demo
 * prices. Set SITE_INDEXABLE=true on the production domain at go-live.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_INDEXABLE !== "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/cart", "/checkout", "/order/", "/track"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
