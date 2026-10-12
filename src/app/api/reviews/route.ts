import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifyTeam } from "@/lib/notify";
import { hit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  author: z.string().trim().min(2, "Please enter your name").max(80),
  role: z.string().trim().max(80).optional(),
  company: z.string().trim().max(100).optional(),
  country: z.string().trim().max(60).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email — it is never shown").max(120),
  productLine: z.string().trim().max(80).optional(),
  rating: z.coerce.number().int().min(1, "Choose a star rating").max(5),
  quote: z.string().trim().min(20, "Please write at least a sentence or two").max(1200),
  photo: z.string().regex(/^\/uploads\/[a-z0-9]{10,40}$/).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Please agree that we may show your review" }),
  website: z.string().max(200).optional(), // honeypot
});

/**
 * A client review from the website. Saved as pending: it appears on the site only after
 * the team reads and publishes it. If the email belongs to a customer with a real order,
 * the review is marked as a verified buyer.
 */
export async function POST(request: Request) {
  const limit = hit(`review:${clientIp(request.headers)}`, 3, 30 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Thanks — you've already sent a review. Please try again later." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 400 });
  const { website, photo, ...d } = parsed.data;
  if (website) return NextResponse.json({ ok: true });

  const customer = await db.customer.findUnique({ where: { email: d.email }, select: { id: true, _count: { select: { orders: { where: { isDemo: false, status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] } } } } } } }).catch(() => null);
  const row = await db.testimonial.create({
    data: {
      author: d.author,
      role: d.role || null,
      company: d.company || null,
      country: d.country || null,
      email: d.email,
      productLine: d.productLine || null,
      rating: d.rating,
      quote: d.quote,
      photo: photo || null,
      source: "website",
      pending: true,
      published: false,
      verified: Boolean(customer && customer._count.orders > 0),
      customerId: customer?.id ?? null,
    },
    select: { id: true },
  });
  revalidateTag("admin", { expire: 0 });
  void notifyTeam(`New ${d.rating}★ review from ${d.author}`, [`${d.author}${d.company ? `, ${d.company}` : ""}${d.country ? ` (${d.country})` : ""}`, `${d.rating} / 5 stars`, "", d.quote, "", "Publish or hide it in Admin → Reviews."].join("\n"));
  return NextResponse.json({ ok: true, id: row.id });
}
