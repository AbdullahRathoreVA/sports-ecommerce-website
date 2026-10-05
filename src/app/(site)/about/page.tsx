import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { PageHero, CaptionedImage } from "@/components/site/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { FilmButton } from "@/components/media/film-player";

export const metadata: Metadata = {
  title: "About",
  description: "A manufacturer and wholesaler of sportswear and leather goods with its own factory — sublimation, embroidery, cut and sew under one roof.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const s = await getSettings();
  const facts = [
    s.facts.founded && ["Established", s.facts.founded],
    s.facts.teamSize && ["Team", s.facts.teamSize],
    s.facts.monthlyCapacity && ["Monthly capacity", s.facts.monthlyCapacity],
    s.facts.exportMarkets && ["Export markets", s.facts.exportMarkets],
  ].filter(Boolean) as [string, string][];

  return (
    <>
      <PageHero eyebrow={`About ${s.brand.name}`} title="A factory, not a middleman." intro={s.brand.description} image="/media/factory/exterior-building.webp" imageAlt="Factory building" />
      <section className="container-x grid gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-24">
        <div className="space-y-5 text-[17px] leading-relaxed text-muted">
          <h2 className="font-display text-[clamp(2.2rem,7vw,3.6rem)] text-fg">Why buyers work with us</h2>
          <p>
            We&apos;re manufacturers and wholesalers. The printers, presses, embroidery machines and stitching halls you see on this site are
            ours — so the people quoting your order are the same people making it.
          </p>
          <p>
            That matters in three ways: we can tell you honestly what&apos;s possible, we control quality from print to packing, and there&apos;s no
            agent margin sitting between your budget and the product.
          </p>
          <p>
            We make sublimated teamwear, motorbike and kart racing suits, leather jackets, American football and racing gloves, and
            sportswear — for clubs, schools, brands, retailers and riders.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink href="/factory">See the factory</ButtonLink>
            <FilmButton variant="light" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <CaptionedImage src="/media/factory/embroidery.webp" alt="Embroidery machines" caption="Embroidery." ratio="aspect-square" />
          <CaptionedImage src="/media/factory/printer-numbers.webp" alt="Printer producing numbered panels" caption="Sublimation printing." ratio="aspect-square" />
          <CaptionedImage src="/media/work/royal-saints-marble.webp" alt="Finished goalkeeper kit" caption="Finished kit." ratio="aspect-square" />
          <CaptionedImage src="/media/products/leather-craft.webp" alt="Stitching leather" caption="Leather work." ratio="aspect-square" />
        </div>
      </section>
      {facts.length > 0 && (
        <section className="border-y hairline bg-chalk">
          <dl className="container-x grid grid-cols-2 gap-6 py-12 lg:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="eyebrow text-subtle">{label}</dt>
                <dd className="font-display mt-2 text-4xl">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  );
}
