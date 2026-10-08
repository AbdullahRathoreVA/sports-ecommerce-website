import "server-only";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { FACTORY_VIDEO_ENABLED } from "@/components/media/config";

/**
 * Go-live checklist (idea from triad-thread-studio's launch gate): every item
 * is computed from real settings, env and data, so it ticks itself off as the
 * work gets done. Publishing a guessed phone number or a placeholder photo
 * costs more trust than leaving it out — this shows what is still missing.
 */

export type LaunchItem = { key: string; label: string; done: boolean; how: string; required: boolean; detail?: string };

export async function getLaunchChecklist(): Promise<LaunchItem[]> {
  const [settings, placeholderProducts, demoOrders, demoLeads, certs, testimonials] = await Promise.all([
    getSettings(),
    db.product.count({ where: { status: "ACTIVE", images: { some: { source: "placeholder" } } } }),
    db.order.count({ where: { isDemo: true } }),
    db.lead.count({ where: { isDemo: true } }),
    db.certification.count({ where: { published: true } }),
    db.testimonial.count({ where: { published: true } }),
  ]);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const ownDomain = /^https:\/\//.test(site) && !/vercel\.app|localhost/.test(site);

  return [
    { key: "domain", required: true, label: "Own domain connected", done: ownDomain, detail: site || "not set", how: "Buy alrobelsportswear.com and point it at the site (Abdullah)." },
    { key: "inbox", required: true, label: "Business email on the site", done: Boolean(settings.contact.email), how: "Create info@alrobelsportswear.com, then add it in Content → Settings." },
    { key: "sending", required: true, label: "Emails to customers switched on", done: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), how: "Verify the domain with the email sender so quote confirmations and portal codes are delivered (Abdullah)." },
    { key: "whatsapp", required: true, label: "WhatsApp Business number", done: Boolean(settings.contact.whatsapp), how: "Add the full number with country code in Content → Settings." },
    { key: "phone", required: true, label: "Phone number (USA / Pakistan)", done: Boolean(settings.contact.phone), how: "Add the full number in Content → Settings." },
    {
      key: "photos",
      required: true,
      label: "Real product photos",
      done: placeholderProducts === 0,
      detail: placeholderProducts ? `${placeholderProducts} products still use placeholder photos` : undefined,
      how: "Send real photos of each product; they replace the placeholders in Products.",
    },
    { key: "prices", required: true, label: "Prices confirmed and demo mode off", done: !settings.demoMode, how: "Once every price and MOQ is confirmed, turn off demo mode in Content → Settings." },
    {
      key: "demo-data",
      required: true,
      label: "Sample data removed",
      done: demoOrders + demoLeads === 0,
      detail: demoOrders + demoLeads ? `${demoOrders} sample orders, ${demoLeads} sample enquiries` : undefined,
      how: "Content → Purge demo data (real customer records are never touched).",
    },
    { key: "indexing", required: true, label: "Google allowed to list the site", done: process.env.SITE_INDEXABLE === "true", how: "Switched on at launch, after the items above (Abdullah)." },
    { key: "certs", required: false, label: "Certifications", done: certs > 0, how: "Only real certificates: send the name, issuer and number of each, then add them in Content." },
    { key: "testimonials", required: false, label: "Client reviews", done: testimonials > 0, how: "Real quotes from clients (with their permission), added in Content." },
    { key: "video", required: false, label: "New factory video", done: FACTORY_VIDEO_ENABLED, how: "Send the new factory and product videos; they are cut into short clips for the site." },
  ];
}
