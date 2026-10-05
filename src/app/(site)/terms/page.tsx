import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/site/legal";

export const metadata: Metadata = { title: "Terms of sale", alternates: { canonical: "/terms" } };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Terms of sale" updated="October 2026">
      <p>
        <em>
          Draft for client review — these terms describe how the website works and must be reviewed by {s.brand.name} and a qualified adviser
          before launch.
        </em>
      </p>
      <h2>Orders and confirmation</h2>
      <p>Placing an order on the website is an offer to buy. A contract is formed only when we confirm the order in writing. We may decline or adjust an order before confirmation, for example if a product or size is unavailable.</p>
      <h2>Prices and payment</h2>
      <p>Prices are shown in {s.commerce.currency}, ex-works, and exclude freight, duties and taxes unless stated. Freight is quoted after confirmation. Payment terms are set out on your proforma invoice.</p>
      <h2>Custom and private-label work</h2>
      <p>Custom work is produced to the specification and approval sample you confirm. Please check approval samples carefully — bulk production follows them.</p>
      <h2>Samples</h2>
      <p>Samples show construction, materials and finish. Minor variation between a sample and bulk production (for example in natural leather grain) is normal.</p>
      <h2>Delivery</h2>
      <p>Lead times on the website are typical ranges. Your confirmed production and dispatch dates are given with your order confirmation.</p>
      <h2>Faults and returns</h2>
      <p>Tell us about any fault within 14 days of delivery with photos, and we will work with you on a repair, replacement or credit. Custom-made goods cannot be returned for change of mind.</p>
    </LegalPage>
  );
}
