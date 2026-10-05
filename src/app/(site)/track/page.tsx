import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { orderToken } from "@/lib/refs";
import { trackInputSchema } from "@/lib/validation";
import { hit, clientIp } from "@/lib/rate-limit";
import { Field, inputClass } from "@/components/forms/field";

export const metadata: Metadata = {
  title: "Track an order",
  description: "Check the status of your order with your order number and email address.",
  alternates: { canonical: "/track" },
};

async function lookup(formData: FormData) {
  "use server";
  const h = await headers();
  if (!hit(`track:${clientIp(h)}`, 10, 15 * 60 * 1000).ok) redirect("/track?error=limit");
  const parsed = trackInputSchema.safeParse({ orderNumber: formData.get("orderNumber"), email: formData.get("email") });
  if (!parsed.success) redirect("/track?error=format");
  const order = await db.order.findUnique({ where: { orderNumber: parsed.data.orderNumber }, select: { orderNumber: true, contactEmail: true } });
  // Same response for "no such order" and "wrong email" — no enumeration.
  if (!order || order.contactEmail.toLowerCase() !== parsed.data.email) redirect("/track?error=notfound");
  redirect(`/order/${order.orderNumber}?t=${orderToken(order.orderNumber)}`);
}

const MESSAGES: Record<string, string> = {
  notfound: "We couldn't find an order with that number and email. Check both and try again.",
  format: "Check the order number format, e.g. GL-261005-K3P9.",
  limit: "Too many attempts — please wait a few minutes.",
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="container-x max-w-xl pb-28 pt-10 lg:pb-24 lg:pt-14">
      <p className="eyebrow text-accent">Order status</p>
      <h1 className="font-display mt-3 text-[clamp(2.6rem,9vw,4.2rem)]">Track an order</h1>
      <p className="mt-3 text-muted">Enter the order number shown when you placed your order.</p>
      <form action={lookup} className="mt-8 space-y-4">
        <Field label="Order number" htmlFor="orderNumber">
          <input id="orderNumber" name="orderNumber" required placeholder="GL-261005-K3P9" autoCapitalize="characters" className={`${inputClass} font-mono uppercase`} />
        </Field>
        <Field label="Email used for the order" htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </Field>
        {error && MESSAGES[error] && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            {MESSAGES[error]}
          </p>
        )}
        <button type="submit" className="h-12 w-full rounded-[var(--radius-control)] bg-white font-semibold text-ink">
          Check status
        </button>
      </form>
    </div>
  );
}
