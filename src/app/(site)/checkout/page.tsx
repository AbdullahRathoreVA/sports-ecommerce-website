import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/cart/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <div className="container-x pb-28 pt-10 lg:pb-24 lg:pt-14">
      <h1 className="font-display text-[clamp(2.6rem,9vw,4.2rem)]">Checkout</h1>
      <CheckoutForm paymentMethods={settings.commerce.paymentMethods} shippingNote={settings.commerce.shippingNote} />
    </div>
  );
}
