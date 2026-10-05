import "server-only";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { db, hasDatabase } from "@/lib/db";
import { defaultSettings, type SiteSettings } from "@/config/site";

export const SETTINGS_TAG = "settings";

const str = z.string().max(500).default("");

export const siteSettingsSchema = z.object({
  brand: z.object({
    name: z.string().min(1).max(60),
    shortName: z.string().min(1).max(30),
    tagline: z.string().max(120),
    description: z.string().max(400),
    houseLabel: str,
  }),
  contact: z.object({
    email: z.union([z.literal(""), z.string().email()]).default(""),
    phone: str,
    whatsapp: z.string().regex(/^\d{0,15}$/, "Digits only, international format").default(""),
    addressLine: str,
    city: str,
    country: str,
    mapsUrl: z.union([z.literal(""), z.string().url()]).default(""),
    hours: str,
    responseTime: str,
  }),
  social: z.object({
    instagram: z.union([z.literal(""), z.string().url()]).default(""),
    facebook: z.union([z.literal(""), z.string().url()]).default(""),
    linkedin: z.union([z.literal(""), z.string().url()]).default(""),
    tiktok: z.union([z.literal(""), z.string().url()]).default(""),
    youtube: z.union([z.literal(""), z.string().url()]).default(""),
  }),
  commerce: z.object({
    currency: z.string().length(3),
    paymentMethods: z
      .array(z.object({ id: z.string().min(1).max(40), label: z.string().min(1).max(80), detail: z.string().max(240) }))
      .min(1)
      .max(6),
    shippingNote: z.string().max(400),
    sampleNote: z.string().max(400),
  }),
  facts: z.object({ founded: str, teamSize: str, monthlyCapacity: str, exportMarkets: str }),
  demoMode: z.boolean(),
});

function merge(stored: unknown): SiteSettings {
  // Deep-merge stored values over defaults so a newly added field never
  // breaks an older stored document.
  const s = (stored ?? {}) as Partial<SiteSettings>;
  const merged = {
    ...defaultSettings,
    ...s,
    brand: { ...defaultSettings.brand, ...s.brand },
    contact: { ...defaultSettings.contact, ...s.contact },
    social: { ...defaultSettings.social, ...s.social },
    commerce: { ...defaultSettings.commerce, ...s.commerce },
    facts: { ...defaultSettings.facts, ...s.facts },
  };
  const parsed = siteSettingsSchema.safeParse(merged);
  return parsed.success ? (parsed.data as SiteSettings) : defaultSettings;
}

const loadSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    if (!hasDatabase()) return defaultSettings;
    try {
      const row = await db.setting.findUnique({ where: { key: "site" } });
      return merge(row?.value);
    } catch (error) {
      console.error("[settings] falling back to defaults", error);
      return defaultSettings;
    }
  },
  ["site-settings"],
  { tags: [SETTINGS_TAG], revalidate: 300 },
);

export async function getSettings(): Promise<SiteSettings> {
  return loadSettings();
}

export function whatsappLink(settings: SiteSettings, message?: string): string | null {
  if (!settings.contact.whatsapp) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${settings.contact.whatsapp}${text}`;
}
