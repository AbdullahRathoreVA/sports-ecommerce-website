import type { Metadata } from "next";
import { ArrowRight, Box, Brush, FileCheck2, Layers, PenTool, Ruler, Shirt, Tag } from "lucide-react";
import { PageHero, CaptionedImage } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { AskButton } from "@/components/assistant/ask-chips";
import { getFaqs } from "@/lib/catalog";
import { JsonLd, faqSchema } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  title: "OEM & Private Label Sportswear Manufacturing",
  description:
    "Your brand, made in our factory: private-label teamwear, racing suits, leather jackets and gloves with your labels, neck tape, hang tags and packaging. Samples before bulk.",
  alternates: { canonical: "/oem" },
};

const OFFER = [
  { icon: PenTool, title: "Your design or ours", body: "Send tech packs and artwork, a reference sample, or a sketch — we can work from any starting point." },
  { icon: Shirt, title: "Your patterns", body: "Cut to your size chart, or adapt our patterns to your fit." },
  { icon: Tag, title: "Your labels", body: "Woven and printed labels, custom neck tape, care labels and hang tags." },
  { icon: Brush, title: "Your decoration", body: "Sublimation, embroidery and printed logos — placed exactly to spec." },
  { icon: Box, title: "Your packaging", body: "Individual polybags, branded cartons and per-size or per-player packing." },
  { icon: Ruler, title: "Made to measure", body: "Measurement-based cutting for racing suits and individual riders." },
];

const STEPS = [
  { n: "01", t: "Brief & quote", b: "Share product, quantity, specs and deadline. We reply with pricing, sample cost and a production slot." },
  { n: "02", t: "Tech pack & artwork", b: "We confirm materials, sizes, colours and placement with you — in writing." },
  { n: "03", t: "Approval sample", b: "We make a physical sample. You approve it or request changes before anything goes to bulk." },
  { n: "04", t: "Bulk production", b: "Printed, cut, stitched and checked in our own factory against the approved sample." },
  { n: "05", t: "Packing & dispatch", b: "Packed to your instructions and shipped by air, sea or express courier." },
];

export default async function OemPage() {
  const faqs = (await getFaqs()).filter((f) => ["oem", "design", "ordering"].includes(f.topic));
  return (
    <>
      {faqs.length > 0 && <JsonLd data={faqSchema(faqs)} />}
      <PageHero
        eyebrow="OEM & private label"
        title="Your brand. Our factory."
        intro="We manufacture under your label — teamwear, racing suits, leather jackets, gloves and sportswear — with your patterns, labels and packaging. We stay invisible; your brand gets the credit."
        image="/media/work/detail-crest.webp"
        imageAlt="Close-up of a custom neck tape and printed crest"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/quote" size="lg" data-track="oem_cta" data-track-label="OEM hero">
            Start an OEM project <ArrowRight className="h-4 w-4" aria-hidden />
          </ButtonLink>
          <AskButton label="Ask about private label" question="How does private label work with you, and what do you need from me?" />
        </div>
      </PageHero>

      <section className="container-x py-16 lg:py-24" aria-labelledby="offer">
        <h2 id="offer" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
          What we make for your brand
        </h2>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OFFER.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-[var(--radius-card)] border hairline bg-surface p-6" data-reveal>
              <Icon className="h-6 w-6 text-accent" aria-hidden />
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y hairline bg-chalk py-16 lg:py-24" aria-labelledby="proof">
        <div className="container-x">
          <h2 id="proof" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
            Details that carry your name
          </h2>
          <p className="mt-3 max-w-2xl text-muted">Real pieces from our factory floor — custom neck tape, printed crests and sponsor placements made to each client&apos;s spec.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <CaptionedImage src="/media/work/detail-sponsor.webp" alt="Sponsor logo printed across a blue shirt" caption="Sponsor printed edge to edge — no patches to peel." ratio="aspect-[3/4]" />
            <CaptionedImage src="/media/work/detail-pink.webp" alt="Pink shirt with printed crest and custom neck tape" caption="Custom neck tape and crest placement." ratio="aspect-[3/4]" />
            <CaptionedImage src="/media/work/royal-saints-pink-back.webp" alt="Back of pink shirt with team name and number" caption="Team name and number printed into the panel." ratio="aspect-[3/4]" />
          </div>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24" aria-labelledby="steps">
        <h2 id="steps" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
          How an OEM order runs
        </h2>
        <ol className="mt-10 grid gap-4 lg:grid-cols-5">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-[var(--radius-card)] border hairline bg-surface p-6" data-reveal>
              <p className="font-mono text-sm text-accent">{s.n}</p>
              <h3 className="mt-5 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="on-dark bg-ink py-16 text-white lg:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-[clamp(2.2rem,7vw,4rem)]">What to send us</h2>
            <p className="mt-4 text-white/70">The more of this you share, the faster and more accurate the first quote.</p>
            <ButtonLink href="/insights/oem-sportswear-order-checklist" variant="outline-light" className="mt-6">
              Read the full OEM checklist
            </ButtonLink>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {["Product & intended use", "Quantity and size split", "Fabric or material preference", "Logo & artwork files", "Decoration method & placement", "Names & numbers roster", "Labels & packaging", "Deadline & delivery city"].map((x) => (
              <li key={x} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px]">
                <FileCheck2 className="h-4 w-4 shrink-0 text-accent" aria-hidden /> {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="container-x py-16 lg:py-24" aria-labelledby="oem-faq">
          <h2 id="oem-faq" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
            OEM questions
          </h2>
          <div className="mt-8 divide-y hairline border-y hairline">
            {faqs.map((f) => (
              <details key={f.id} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <Layers className="h-5 w-5 shrink-0 text-subtle transition-transform group-open:rotate-90" aria-hidden />
                </summary>
                <p className="pb-5 text-[15px] leading-relaxed text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
