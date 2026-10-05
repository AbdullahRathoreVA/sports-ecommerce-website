import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-x pb-28 pt-10 lg:pb-24 lg:pt-14">
      <h1 className="font-display text-[clamp(2.6rem,9vw,4.2rem)]">Your cart</h1>
      <CartView />
    </div>
  );
}
