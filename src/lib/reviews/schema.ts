import { z } from "zod";

/** Strip control characters (keep newlines/tabs) — the text is stored and shown as plain text. */
const clean = (v: string) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
const text = (min: number, max: number, msg?: string) => z.string().transform(clean).pipe(z.string().min(min, msg).max(max));
const optional = (max: number) => z.string().transform(clean).pipe(z.string().max(max)).optional();

/** What the public review form may send. The verified flag is never accepted from the browser. */
export const reviewSubmissionSchema = z.object({
  author: text(2, 80, "Please enter your name"),
  role: optional(80),
  company: optional(100),
  country: optional(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email — it is never shown").max(120),
  productLine: optional(80),
  title: optional(100),
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  quote: text(20, 1200, "Please write at least a sentence or two"),
  photo: z.string().regex(/^\/uploads\/[a-z0-9]{10,40}$/).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Please agree that we may show your review" }),
  invite: z.string().max(80).optional(),
  website: z.string().max(200).optional(), // honeypot
});

export type ReviewSubmission = z.infer<typeof reviewSubmissionSchema>;

/** The publication terms the reviewer agrees to (stored with each review by version). */
export const CONSENT_VERSION = "2026-10-24";
export const CONSENT_TEXT =
  "I agree that Alrobel Sportswear may publish my rating, title, review, name, company, country and photo on its website. My email, order details and anything I mark private are never shown. I can ask for the review to be removed at any time by emailing the company.";
