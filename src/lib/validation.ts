import { z } from "zod";

/**
 * Request schemas shared by API routes and (where useful) client forms.
 * Free text is length-capped everywhere — it ends up in emails, admin
 * tables and AI prompts.
 */

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(120);

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d][\d\s().-]{5,}$/, "Enter a valid phone number")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const leadSourceSchema = z.enum(["QUOTE_FORM", "PRODUCT_PAGE", "CONTACT_FORM", "AI_ASSISTANT", "DESIGN_STUDIO", "PRODUCT_FINDER"]);

export const leadInputSchema = z.object({
  source: leadSourceSchema,
  name: text(80).min(2, "Please enter your name"),
  email: emailSchema,
  phone: phoneSchema,
  company: optionalText(120),
  country: optionalText(60),
  preferredChannel: z.enum(["email", "whatsapp", "phone"]).default("email"),
  productSlug: optionalText(80),
  productName: optionalText(120),
  category: optionalText(60),
  quantity: z.coerce.number().int().min(1).max(1_000_000).optional(),
  requirements: z
    .object({
      material: optionalText(200),
      colors: optionalText(200),
      branding: optionalText(300),
      sizes: optionalText(300),
      decoration: optionalText(200),
      packaging: optionalText(200),
      notes: optionalText(1000),
      sizeBreakdown: optionalText(600),
    })
    .partial()
    .optional(),
  budget: optionalText(80),
  targetDate: optionalText(80),
  message: optionalText(4000),
  // Design Studio snapshot (spec + small preview/crest images). Capped so it
  // can't be used to push large payloads into the database.
  design: z
    .record(z.string(), z.unknown())
    .refine((d) => JSON.stringify(d).length <= 350_000, "Design is too large — remove the crest and try again.")
    .optional(),
  transcript: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: text(2000) }))
    .max(30)
    .optional(),
  /** Squad list from the quote form: one row per player. */
  roster: z
    .array(z.object({ name: z.string().trim().max(40), number: z.string().trim().regex(/^\d{0,3}$/), size: z.string().trim().max(8) }))
    .max(500)
    .optional(),
  /** Logos / artwork the visitor uploaded (site-hosted paths only). */
  attachments: z.array(z.string().regex(/^\/uploads\/[a-z0-9]{10,40}$/)).max(6).optional(),
  sessionId: optionalText(40),
  /** Honeypot — must be empty. */
  website: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export const orderLineSchema = z.object({
  productId: z.string().min(5).max(40),
  size: z.string().max(40).nullable().optional(),
  isSample: z.boolean(),
  quantity: z.number().int().min(1).max(100_000),
});

export const orderInputSchema = z.object({
  lines: z.array(orderLineSchema).min(1, "Your cart is empty").max(40),
  expectedTotalCents: z.number().int().min(0),
  contact: z.object({
    name: text(80).min(2, "Please enter your name"),
    email: emailSchema,
    phone: phoneSchema,
    company: optionalText(120),
  }),
  shipping: z.object({
    line1: text(160).min(3, "Enter your street address"),
    line2: optionalText(160),
    city: text(80).min(2, "Enter your city"),
    region: optionalText(80),
    postal: optionalText(20),
    country: text(60).min(2, "Choose your country"),
  }),
  paymentMethod: z.string().min(2).max(40),
  /** Recorded with a timestamp — evidence if a sale is disputed later. */
  acceptTerms: z.literal(true, "Please accept the terms of sale"),
  note: optionalText(2000),
  sessionId: optionalText(40),
  website: z.string().max(200).optional(),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

export const trackInputSchema = z.object({
  orderNumber: z.string().trim().toUpperCase().regex(/^(AL|GL)-\d{6}-[A-Z0-9]{3,6}$/, "Check the order number format, e.g. AL-261005-K3P9"),
  email: emailSchema,
});

/** First human-readable message per field, for form error display. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
