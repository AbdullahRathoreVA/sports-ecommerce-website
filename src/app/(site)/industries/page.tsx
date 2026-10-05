import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero, CaptionedImage } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { getAllProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product/product-card";

export const metadata: Metadata = {
  title: "Who We Make For — Teams, Brands, Retailers & Race Teams",
  description: "Custom kits for clubs and schools, private label for brands, wholesale stock for retailers, and leathers and race suits for riders and motorsport teams.",
  alternates: { canonical: "/industries" },
};

const SEGMENTS = [
  {
    id: "teams",
    title: "Teams, clubs & schools",
    body: "Full match kits, goalkeeper kits, training wear, tracksuits and varsity jackets — every player's name and number printed in, packed per player.",
    points: ["Home, away and keeper kits designed as a set", "Youth and adult sizes in one order", "Sponsor placements printed, not patched"],
    image: "/media/work/royal-saints-trio.webp",
    alt: "Three club kits",
    caption: "A club's three-kit set, printed in-house.",
    uses: ["clubs", "schools", "leagues", "academies"],
  },
  {
    id: "brands",
    title: "Brands & private label",
    body: "Your designs, your labels, your packaging. We manufacture quietly behind your brand, from first sample to repeat runs.",
    points: ["Tech pack or reference-sample development", "Custom labels, neck tape, tags and polybags", "Repeatable quality across reorders"],
    image: "/media/work/detail-crest.webp",
    alt: "Custom neck tape detail",
    caption: "Custom neck tape and printed crest.",
    uses: ["brands"],
  },
  {
    id: "retail",
    title: "Retailers & wholesalers",
    body: "Leather jackets, gloves, race suits and sportswear for your shelves — consistent sizing and finish, priced by quantity.",
    points: ["Quantity-tier pricing", "Size-run packing for stores", "Samples to test before you commit"],
    image: "/media/products/biker-jacket.webp",
    alt: "Leather biker jacket",
    caption: "Biker jacket — wholesale or private label.",
    uses: ["retailers"],
  },
  {
    id: "motorsport",
    title: "Riders & race teams",
    body: "One- and two-piece leathers, kart suits, car racing overalls and gloves in your livery — standard sizes or made to measure.",
    points: ["Panel-by-panel colour layouts", "Sponsor and number placement", "Made-to-measure options for individual riders"],
    image: "/media/products/race-suit-2pc.webp",
    alt: "Two-piece racing leathers",
    caption: "Two-piece leathers in team colours.",
    uses: ["riders", "racing-teams"],
  },
];

export default async function IndustriesPage() {
  const products = await getAllProducts();
  return (
    <>
      <PageHero eyebrow="Who we make for" title="Built for the people who wear it." intro="Four kinds of customer, one factory. Here's how we work with each." image="/media/work/stripes-trio.webp" />
      <nav aria-label="Jump to" className="container-x scrollbar-none flex gap-2 overflow-x-auto py-6">
        {SEGMENTS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="inline-flex h-11 shrink-0 items-center rounded-full border hairline bg-surface px-4 text-sm font-semibold hover:border-white/35">
            {s.title}
          </a>
        ))}
      </nav>
      {SEGMENTS.map((s, i) => {
        const picks = products.filter((p) => p.useCases.some((u) => s.uses.includes(u))).slice(0, 4);
        return (
          <section key={s.id} id={s.id} className={i % 2 ? "border-y hairline bg-chalk py-16 lg:py-20" : "py-16 lg:py-20"} aria-labelledby={`${s.id}-h`}>
            <div className="container-x">
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <CaptionedImage src={s.image} alt={s.alt} caption={s.caption} className={i % 2 ? "lg:order-2" : ""} sizes="(min-width:1024px) 50vw, 100vw" />
                <div>
                  <h2 id={`${s.id}-h`} className="font-display text-[clamp(2.2rem,7vw,3.6rem)]">
                    {s.title}
                  </h2>
                  <p className="mt-4 text-[17px] leading-relaxed text-muted">{s.body}</p>
                  <ul className="mt-6 space-y-2">
                    {s.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3 text-[15px]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden /> {pt}
                      </li>
                    ))}
                  </ul>
                  <ButtonLink href={`/quote`} className="mt-7" data-track="cta_click" data-track-label={`Industries: ${s.title}`}>
                    Get a quote <ArrowRight className="h-4 w-4" aria-hidden />
                  </ButtonLink>
                </div>
              </div>
              {picks.length > 0 && (
                <>
                  <div className="mt-12 flex items-end justify-between">
                    <p className="text-lg font-semibold">Popular with {s.title.toLowerCase()}</p>
                    <Link href={`/products?use=${s.uses[0]}`} className="text-sm font-semibold text-accent hover:underline">
                      See all
                    </Link>
                  </div>
                  <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4">
                    {picks.map((p) => (
                      <li key={p.id}>
                        <ProductCard product={p} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
