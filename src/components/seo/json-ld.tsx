import { safeJson } from "@/lib/utils";
import { siteUrl, type SiteSettings } from "@/config/site";
import type { ProductDetail } from "@/lib/catalog";

/** Structured data emitters. Only facts that exist are included — never placeholders. */

export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}

export function organizationSchema(s: SiteSettings) {
  const sameAs = Object.values(s.social).filter(Boolean);
  const address =
    s.contact.addressLine || s.contact.city || s.contact.country
      ? {
          "@type": "PostalAddress",
          ...(s.contact.addressLine && { streetAddress: s.contact.addressLine }),
          ...(s.contact.city && { addressLocality: s.contact.city }),
          ...(s.contact.country && { addressCountry: s.contact.country }),
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: s.brand.name,
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    description: s.brand.description,
    ...(s.contact.email && { email: s.contact.email }),
    ...(s.contact.phone && { telephone: s.contact.phone }),
    ...(address && { address }),
    ...(sameAs.length && { sameAs }),
  };
}

export function websiteSchema(s: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: s.brand.name,
    publisher: { "@id": `${siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/products?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

export function productSchema(p: ProductDetail, brand: string) {
  const offers =
    p.purchaseMode !== "QUOTE" && p.priceTiers.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: p.currency,
          lowPrice: (Math.min(...p.priceTiers.map((t) => t.unitCents)) / 100).toFixed(2),
          highPrice: (Math.max(...p.priceTiers.map((t) => t.unitCents)) / 100).toFixed(2),
          offerCount: p.priceTiers.length,
          availability: "https://schema.org/MadeToOrder",
          url: `${siteUrl}/products/${p.slug}`,
        }
      : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.summary,
    sku: p.sku,
    category: p.category.name,
    brand: { "@type": "Brand", name: brand },
    manufacturer: { "@id": `${siteUrl}/#organization` },
    image: p.images.map((i) => `${siteUrl}${i.url}`),
    url: `${siteUrl}/products/${p.slug}`,
    ...(p.materials.length && { material: p.materials.join(", ") }),
    ...(offers && { offers }),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function articleSchema(post: { title: string; excerpt: string; slug: string; coverImage: string | null; publishedAt: Date | string | null; updatedAt: Date | string }, brand: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    url: `${siteUrl}/insights/${post.slug}`,
    ...(post.coverImage && { image: `${siteUrl}${post.coverImage}` }),
    ...(post.publishedAt && { datePublished: new Date(post.publishedAt).toISOString() }),
    dateModified: new Date(post.updatedAt).toISOString(),
    author: { "@type": "Organization", name: brand },
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}
