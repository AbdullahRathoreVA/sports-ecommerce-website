import { getCategories, getPosts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { FOUNDER, ORDER_TERMS, siteUrl } from "@/config/site";

/**
 * /llms.txt — a short, factual guide to the site for AI assistants
 * (llmstxt.org format). Built from the live catalogue and settings, so it
 * never says more than the website does. Google ignores it; it's for
 * ChatGPT/Perplexity-style tools.
 */
export const revalidate = 3600;

export async function GET() {
  const [s, categories, posts] = await Promise.all([getSettings(), getCategories(), getPosts()]);
  const lines = [
    `# ${s.brand.name}`,
    "",
    `> ${s.brand.description}`,
    "",
    `- Factory: ${[s.contact.addressLine, s.contact.city, s.contact.country].filter(Boolean).join(", ")}`,
    `- Founder & CEO: ${FOUNDER.name}`,
    `- Minimum order: ${ORDER_TERMS.moq} pieces per design; pricing is quoted per order`,
    `- Samples: one pre-production sample can be ordered online for $${ORDER_TERMS.sampleCents / 100}`,
    ...(s.contact.email ? [`- Email: ${s.contact.email}`] : []),
    ...(s.contact.phone ? [`- Phone: ${s.contact.phone}`] : []),
    ...(s.contact.whatsapp ? [`- WhatsApp: +${s.contact.whatsapp}`] : []),
    "",
    "## Products",
    ...categories.map((c) => `- [${c.name}](${siteUrl}/products/c/${c.slug}): ${c.tagline ?? c.description.slice(0, 140)}`),
    "",
    "## Ordering",
    `- [Request a quote](${siteUrl}/quote): send product, quantity and branding; the team replies in writing`,
    `- [Custom orders, OEM & private label](${siteUrl}/oem)`,
    `- [3D Design Studio](${siteUrl}/design-studio): design a kit, goalkeeper gloves or a football and send it for a quote`,
    `- [Track an order](${siteUrl}/track)`,
    "",
    "## Company",
    `- [About](${siteUrl}/about)`,
    `- [Customer reviews](${siteUrl}/reviews): published with permission; verified buyers are marked`,
    `- [Contact](${siteUrl}/contact)`,
    "",
    ...(posts.length ? ["## Buyer guides", ...posts.map((p) => `- [${p.title}](${siteUrl}/insights/${p.slug}): ${p.excerpt}`), ""] : []),
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
