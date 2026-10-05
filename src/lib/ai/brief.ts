import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { withModel } from "./provider";
import { loadKnowledge } from "./knowledge";
import { extractQuantity } from "./intent";

/**
 * Turns a buyer's messy brief ("need 200 kits navy/gold, logo front, sizes
 * S-XL, by March, Manchester UK") into the quote form's structured fields.
 * LLM with a strict schema when available; regex extraction otherwise.
 * Only fields actually present in the text are returned.
 */

export const briefSchema = z.object({
  productSlug: z.string().optional().describe("Slug of the closest matching product from the catalogue list, if one clearly matches."),
  quantity: z.number().int().positive().max(1_000_000).optional(),
  colors: z.string().max(200).optional(),
  branding: z.string().max(300).optional().describe("Logos, names, numbers, sponsors, labels — where and how."),
  sizes: z.string().max(300).optional().describe("Size range or breakdown as stated."),
  material: z.string().max(200).optional(),
  targetDate: z.string().max(80).optional().describe("Deadline exactly as the buyer phrased it."),
  budget: z.string().max(80).optional(),
  country: z.string().max(60).optional().describe("Delivery country if stated."),
  company: z.string().max(120).optional().describe("Club, school or company name if stated."),
  notes: z.string().max(600).optional().describe("Anything else relevant, concise."),
});

export type Brief = z.infer<typeof briefSchema>;

// Strict JSON-schema providers (Groq, Cerebras) require every key; the model
// returns null for anything not stated, and nulls are dropped below.
const llmBriefSchema = z.object({
  productSlug: z.string().nullable().describe("Slug of the closest matching product from the catalogue list, or null."),
  quantity: z.number().int().positive().max(1_000_000).nullable(),
  colors: z.string().max(200).nullable(),
  branding: z.string().max(300).nullable().describe("Logos, names, numbers, sponsors, labels — where and how."),
  sizes: z.string().max(300).nullable().describe("Size range or breakdown as stated."),
  material: z.string().max(200).nullable(),
  targetDate: z.string().max(80).nullable().describe("Deadline exactly as the buyer phrased it."),
  budget: z.string().max(80).nullable(),
  country: z.string().max(60).nullable().describe("Delivery country if stated."),
  company: z.string().max(120).nullable().describe("Club, school or company name if stated."),
  notes: z.string().max(600).nullable().describe("Anything else relevant, concise."),
});

const COUNTRIES = ["United Kingdom", "UK", "England", "Scotland", "Ireland", "United States", "USA", "Canada", "Australia", "New Zealand", "Germany", "France", "Netherlands", "Italy", "Spain", "UAE", "Dubai", "Saudi Arabia", "Qatar", "Pakistan", "South Africa", "Sweden", "Norway", "Denmark", "Belgium"];
const COLOR_WORDS = /\b(black|white|red|blue|navy|royal|sky|green|yellow|gold|orange|pink|purple|maroon|grey|gray|silver|teal|cyan|lime|claret|burgundy|fluo|neon)\b/gi;

export function regexBrief(text: string, productSlugs: { slug: string; keywords: string[] }[]): Brief {
  const t = text.toLowerCase();
  const out: Brief = {};
  const qty = extractQuantity(text);
  if (qty) out.quantity = qty;
  const colors = [...new Set((text.match(COLOR_WORDS) ?? []).map((c) => c.toLowerCase()))];
  if (colors.length) out.colors = colors.join(", ");
  const sizes = /\b((?:y?xs|y?s|y?m|y?l|y?xl|\dxl|xxl|xxxl)(?:\s*(?:-|–|to|,)\s*(?:y?xs|y?s|y?m|y?l|y?xl|\dxl|xxl|xxxl))+)\b/i.exec(text);
  if (sizes) out.sizes = sizes[1]!.toUpperCase();
  const date = /\b(by|before|deadline|need(?:ed)? (?:it )?by|for)\s+((?:the )?(?:end of )?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{1,2})?|\d{1,2}(?:st|nd|rd|th)?\s+\w+|next (?:week|month)|\d+\s+(?:weeks?|days?|months?))/i.exec(text);
  if (date) out.targetDate = date[2];
  const budget = /((?:\$|usd|£|gbp|€|eur)\s?\d[\d,.]*(?:\s?(?:per|\/)\s?(?:unit|piece|pc|shirt|kit|pair))?)/i.exec(text);
  if (budget) out.budget = budget[1];
  const country = COUNTRIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  if (country) out.country = country === "UK" || country === "England" || country === "Scotland" ? "United Kingdom" : country === "USA" ? "United States" : country === "Dubai" ? "UAE" : country;
  if (/\blogo|crest|sponsor|name|number|embroider|print/i.test(text)) {
    out.branding = (/[^.!?\n]*(logo|crest|sponsor|names?|numbers?|embroider|print)[^.!?\n]*/i.exec(text)?.[0] ?? "").trim().slice(0, 300);
  }
  let best: { slug: string; score: number } | null = null;
  for (const p of productSlugs) {
    const score = p.keywords.filter((k) => t.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { slug: p.slug, score };
  }
  if (best) out.productSlug = best.slug;
  return out;
}

export async function parseBrief(text: string): Promise<{ brief: Brief; engine: string }> {
  const k = await loadKnowledge();
  const catalogue = k.products.map((p) => ({ slug: p.slug, name: p.name, category: p.category.name }));
  const keywords = k.products.map((p) => ({ slug: p.slug, keywords: [...p.tags, ...p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3)] }));

  const result = await withModel(
    async (model, call) => {
      const { output } = await generateText({
        model,
        system:
          "Extract a sportswear manufacturing enquiry into structured fields. Use ONLY information stated in the text — use null for anything not mentioned. Do not guess quantities, dates or budgets. For productSlug, choose from the catalogue only when the match is clear.",
        prompt: `CATALOGUE: ${JSON.stringify(catalogue)}\n\nBUYER TEXT:\n${text}`,
        output: Output.object({ schema: llmBriefSchema }),
        temperature: 0,
        maxOutputTokens: 500,
        ...call,
      });
      return output;
    },
    { label: "brief", timeoutMs: 12_000 },
  );

  if (result) {
    const brief = Object.fromEntries(Object.entries(result.value).filter(([, v]) => v != null && v !== "")) as Brief;
    if (brief.productSlug && !catalogue.some((c) => c.slug === brief.productSlug)) delete brief.productSlug;
    return { brief, engine: result.engine };
  }
  return { brief: regexBrief(text, keywords), engine: "grounded" };
}
