import type { Metadata } from "next";
import { Clock, FileCheck2, ShieldCheck } from "lucide-react";
import { getAllProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { QuoteForm } from "@/components/forms/quote-form";

export const metadata: Metadata = {
  title: "Request a Quote",
  description: "Tell us what you need — product, quantity and customisation — and get a factory-direct quote. Paste your brief and our assistant fills the form for you.",
  alternates: { canonical: "/quote" },
};

type Props = { searchParams: Promise<{ product?: string; qty?: string; category?: string }> };

export default async function QuotePage({ searchParams }: Props) {
  const [params, products, settings] = await Promise.all([searchParams, getAllProducts(), getSettings()]);
  const qty = Number(params.qty);
  return (
    <div className="container-x grid gap-10 pb-24 pt-10 lg:grid-cols-[1fr_380px] lg:gap-16 lg:pb-28 lg:pt-14">
      <div>
        <p className="eyebrow text-accent">Request a quote</p>
        <h1 className="font-display mt-3 text-[clamp(2.6rem,9vw,4.6rem)]">Tell us what you need.</h1>
        <p className="mt-3 max-w-xl text-muted">Two quick steps. The more detail you share, the more accurate your first quote will be.</p>
        <div className="mt-8">
          <QuoteForm
            products={products.map((p) => ({ slug: p.slug, name: p.name, category: p.category.name, moq: p.moq }))}
            initialProduct={params.product?.slice(0, 80)}
            initialQty={Number.isInteger(qty) && qty > 0 ? qty : undefined}
            whatsapp={settings.contact.whatsapp}
            responseTime={settings.contact.responseTime}
          />
        </div>
      </div>
      <aside className="space-y-4 lg:pt-36">
        {[
          { icon: Clock, title: "Fast reply", body: settings.contact.responseTime || "We reply to every request within one working day." },
          { icon: FileCheck2, title: "Clear, written quotes", body: "Unit price, sample cost, lead time and freight options — confirmed in writing before you commit." },
          { icon: ShieldCheck, title: "Sample before bulk", body: "On first orders we recommend a physical approval sample so there are no surprises." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex gap-4 rounded-[var(--radius-card)] border hairline bg-surface p-5">
            <Icon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}
