import "server-only";
import { getAllProducts, getFaqs, getPosts, type ProductDetail } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { formatMoney, leadTimeLabel } from "@/lib/utils";
import type { SiteSettings } from "@/config/site";

/**
 * The assistant's ground truth, assembled from live data on every request
 * (cached upstream). Everything the model may say about the business comes
 * from here; the `unknown` list tells it what it must NOT answer.
 */

export type Knowledge = {
  settings: SiteSettings;
  products: ProductDetail[];
  faqs: { question: string; answer: string }[];
  guides: { slug: string; title: string; excerpt: string }[];
};

export async function loadKnowledge(): Promise<Knowledge> {
  const [settings, products, faqs, posts] = await Promise.all([getSettings(), getAllProducts(), getFaqs(), getPosts()]);
  return {
    settings,
    products,
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    guides: posts.map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt })),
  };
}

/** Evidence-backed capabilities — each is visible in the factory's own photos and video. */
export const FACTORY_CAPABILITIES = [
  "Own factory (manufacturer and wholesaler)",
  "In-house large-format sublimation printers and heat presses",
  "Multi-head embroidery machines",
  "In-house cutting and stitching halls",
  "Finishing, checking and packing per order",
  "OEM / private label: custom labels, neck tape, hang tags and packaging",
];

export function unknownFacts(s: SiteSettings): string[] {
  const out = [
    "Certifications of any kind (ISO, BSCI, CE ratings, FIA/CIK homologation) — none are published; never claim one",
    "Named clients, testimonials or customer counts",
    "Exact factory address, founding year, staff numbers or production capacity (unless listed under company facts)",
    "Guaranteed delivery dates — lead times are typical ranges confirmed per quote",
  ];
  if (!s.contact.whatsapp) out.push("WhatsApp number — not published yet; direct people to the quote form");
  if (!s.contact.phone) out.push("Phone number — not published yet");
  if (!s.contact.email) out.push("Email address — not published yet; use the contact or quote form");
  return out;
}

export function productFacts(p: ProductDetail) {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category.name,
    summary: p.summary,
    howToBuy:
      p.purchaseMode === "QUOTE"
        ? "Quote only"
        : p.purchaseMode === "CART"
          ? "Buy online"
          : "Buy a sample or bulk online, or request a quote for custom work",
    moq: `${p.moq} units`,
    leadTime: leadTimeLabel(p.leadTimeMinDays, p.leadTimeMaxDays) ?? "Confirmed with quote",
    samplePrice: p.samplePriceCents != null ? formatMoney(p.samplePriceCents, p.currency) : "On request",
    priceTiers: p.priceTiers.length
      ? p.priceTiers.map((t) => `${t.minQty}+ units: ${formatMoney(t.unitCents, p.currency)} each`).join("; ")
      : "Price on request",
    specs: p.specs.map((s) => `${s.label}: ${s.value}`),
    materials: p.materials,
    customisation: p.customizations,
    sizes: p.sizes.join(", "),
    suits: p.useCases,
    url: `/products/${p.slug}`,
  };
}

export function companyFacts(s: SiteSettings) {
  const facts = Object.entries(s.facts)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`);
  return {
    name: s.brand.name,
    description: s.brand.description,
    capabilities: FACTORY_CAPABILITIES,
    confirmedFacts: facts,
    location: [s.contact.city, s.contact.country].filter(Boolean).join(", ") || null,
    contact: {
      whatsapp: s.contact.whatsapp ? `https://wa.me/${s.contact.whatsapp}` : null,
      email: s.contact.email || null,
      phone: s.contact.phone || null,
      responseTime: s.contact.responseTime || null,
      quoteForm: "/quote",
      contactPage: "/contact",
    },
    payment: s.commerce.paymentMethods.map((m) => `${m.label} — ${m.detail}`),
    shipping: s.commerce.shippingNote,
    samples: s.commerce.sampleNote,
    pricesAreIndicative: s.demoMode,
  };
}
