import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, Box, Brush, Camera, Factory, PenTool, Plus, Ruler, Shirt, Tag } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { QuoteForm } from "@/components/forms/quote-form";
import { getAllProducts, getFaqs } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { JsonLd, faqSchema } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "Custom Orders, OEM & Private Label Sportswear",
  description:
    "Your brand, made in our Sialkot factory: custom team kits, uniforms and sportswear with your logos, colours, labels, tags and packaging. Samples before bulk.",
  alternates: { canonical: "/oem" },
};

const FEATURES = [
  { icon: Brush, title: "Custom branding", body: "Your logos, colours and designs on any product in our catalogue — sublimated, printed or embroidered." },
  { icon: Factory, title: "OEM manufacturing", body: "We make to your specifications and size chart, under your brand." },
  { icon: PenTool, title: "Your design or ours", body: "Send artwork or a reference sample — or start from our designs and adapt them." },
  { icon: Camera, title: "Quality, on record", body: "Approval samples before bulk, and QC and packing photos shared on your order page." },
];

const OFFER = [
  { icon: Shirt, title: "Your patterns", body: "Cut to your size chart, or adapt our patterns to your fit." },
  { icon: Tag, title: "Your labels & tags", body: "Woven and printed labels, custom neck tape, care labels and hang tags." },
  { icon: Box, title: "Your packaging", body: "Individual polybags, branded cartons and per-size or per-player packing." },
  { icon: Ruler, title: "Names & numbers", body: "Per-player names, numbers and sizes printed or stitched to your list." },
];

const STEPS = [
  { n: "1", t: "Submit RFQ", b: "Send product, quantity, branding and deadline using the form below. We reply with a written quote." },
  { n: "2", t: "Sample approval", b: "We make a physical sample. You approve it or ask for changes before anything goes to bulk." },
  { n: "3", t: "Production", b: "Designed, sublimated, cut and stitched in our own factory, checked against the approved sample." },
  { n: "4", t: "Delivery", b: "Packed to your instructions and shipped to your door by air, sea or express courier." },
];

export default async function OemPage() {
  const [faqs, products, settings] = await Promise.all([getFaqs(), getAllProducts(), getSettings()]);
  const oemFaqs = faqs.filter((f) => ["oem", "design", "ordering"].includes(f.topic)).slice(0, 6);
  return (
    <>
      {oemFaqs.length > 0 && <JsonLd data={faqSchema(oemFaqs)} />}
      <PageHero
        eyebrow="Custom manufacturing / Alrobel Sportswear"
        title="OEM & custom branding solutions"
        intro="Turn any product in our catalogue into your own — from a simple logo to fully custom designs, labels and packaging. Made in our factory, under your brand."
        meta={[
          { label: "Low MOQ", value: "Flexible orders" },
          { label: "OEM / private label", value: "Full branding" },
          { label: "Samples", value: "Before bulk" },
          { label: "Exporting", value: settings.facts.exportMarkets || "Worldwide" },
        ]}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="#rfq" size="lg" data-track="oem_cta" data-track-label="OEM hero">
            Request for quotation <ArrowUpRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="#how" size="lg" variant="outline-light">
            How it works <ArrowDown className="h-4 w-4" aria-hidden />
          </ButtonLink>
        </div>
      </PageHero>

      {/* Feature tiles */}
      <section className="border-b hairline py-14 lg:py-20">
        <ul className="container-x grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="border-t border-fg/20 pt-6" data-reveal style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}>
              <span className="grid h-11 w-11 place-items-center rounded-md bg-accent/10 text-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="mt-5 text-[17px] font-semibold">{title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-24 bg-chalk py-16 lg:py-24" aria-labelledby="how-h">
        <div className="container-x">
          <h2 id="how-h" className="font-display text-[clamp(2.2rem,5vw,3.4rem)]">
            How it works
          </h2>
          <p className="mt-3 max-w-xl text-muted">A clear process from your first message to delivered goods — every step confirmed in writing.</p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.n} className="border-t border-fg/20 pt-6" data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}>
                <span className="grid h-9 w-9 place-items-center rounded-sm bg-ink text-sm font-semibold text-white">{s.n}</span>
                <h3 className="mt-5 text-[17px] font-semibold">{s.t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.b}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-14 grid gap-x-8 gap-y-5 border-t hairline pt-10 sm:grid-cols-2 lg:grid-cols-4">
            {OFFER.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="block text-[15px] font-semibold">{title}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* RFQ */}
      <section id="rfq" className="scroll-mt-24 py-16 lg:py-24" aria-labelledby="rfq-h">
        <div className="container-x max-w-4xl">
          <h2 id="rfq-h" className="font-display text-[clamp(2.2rem,5vw,3.4rem)]">
            Request for quotation
          </h2>
          <p className="mt-3 text-muted">Complete the form and our team will reply with a written quote by email.</p>
          <div className="mt-8 rounded-[var(--radius-card)] bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-34px_rgba(0,0,0,0.3)] sm:p-8">
            <QuoteForm
              products={products.map((p) => ({ slug: p.slug, name: p.name, category: p.category.name, moq: p.moq }))}
              whatsapp={settings.contact.whatsapp}
              responseTime={settings.contact.responseTime}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      {oemFaqs.length > 0 && (
        <section className="bg-chalk py-16 lg:py-24" aria-labelledby="oem-faq">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <h2 id="oem-faq" className="font-display text-[clamp(2.2rem,5vw,3.4rem)]">
              Frequently asked
              <span className="block text-subtle">questions.</span>
            </h2>
            <div className="border-t hairline">
              {oemFaqs.map((f) => (
                <details key={f.id} className="group border-b hairline">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <Plus className="h-5 w-5 shrink-0 transition-transform group-open:rotate-45" aria-hidden />
                  </summary>
                  <p className="pb-5 pr-10 text-[15px] leading-relaxed text-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
