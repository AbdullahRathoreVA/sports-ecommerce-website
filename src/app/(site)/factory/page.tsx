import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero, CaptionedImage } from "@/components/site/page-hero";
import { ClipReel, FACTORY_CLIPS } from "@/components/media/clip-reel";
import { FilmButton, FACTORY_FILM, SHORT_FILM } from "@/components/media/film-player";
import { ButtonLink } from "@/components/ui/button";
import { getPublishedCertifications } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Inside the Factory — Sublimation, Embroidery, Cut & Sew",
  description:
    "See our own factory: large-format sublimation printers, heat presses, multi-head embroidery, cutting and stitching halls, finishing and packing — filmed on the factory floor.",
  alternates: { canonical: "/factory" },
};

const STAGES = [
  {
    n: "01",
    title: "Print room",
    body: "Artwork is printed in mirror image onto transfer paper on our large-format sublimation printers. A dedicated room keeps dust and humidity under control, so colours stay consistent from the first panel to the last.",
    image: "/media/factory/print-room.webp",
    alt: "Clean print room with several large-format sublimation printers",
    caption: "Our print room — several large-format printers running side by side.",
  },
  {
    n: "02",
    title: "Heat press transfer",
    body: "Printed paper is laid onto fabric and pressed under heat and pressure. The ink turns to gas and bonds into the polyester — the design becomes part of the fabric, so it can't crack or peel.",
    image: "/media/factory/printer-panels.webp",
    alt: "Printer producing sheets of yellow jersey panels with tiger crests",
    caption: "Jersey panels printed and ready for the press.",
  },
  {
    n: "03",
    title: "Embroidery",
    body: "Multi-head embroidery machines stitch crests, logos and initials onto tracksuits, jackets and caps — many identical pieces at once for consistent results across a squad.",
    image: "/media/factory/embroidery.webp",
    alt: "Row of multi-head embroidery machines with thread cones on top",
    caption: "Multi-head embroidery machines for crests and logos.",
  },
  {
    n: "04",
    title: "Cut, stitch & finish",
    body: "Panels are cut, stitched and finished in our own halls, then checked for size, print and seams — and names and numbers checked against your roster — before packing.",
    image: "/media/products/leather-craft.webp",
    alt: "Hands guiding black leather under an industrial sewing machine",
    caption: "Leather panels under the needle — heavy-duty machines for suits and jackets.",
  },
];

export default async function FactoryPage() {
  const certs = await getPublishedCertifications();
  return (
    <>
      <PageHero
        eyebrow="Our factory"
        title="Everything under one roof."
        intro="We design, print, press, embroider, cut, stitch, check and pack in our own factory. No middlemen and no outsourced printing — which is why we can promise what we quote."
        image="/media/factory/print-room.webp"
        imageAlt="Print room"
      >
        <div className="flex flex-wrap gap-3">
          <FilmButton film={FACTORY_FILM} />
          <FilmButton film={SHORT_FILM} />
        </div>
      </PageHero>

      <section className="container-x py-16 lg:py-24" aria-labelledby="reel">
        <h2 id="reel" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
          The process, in real footage
        </h2>
        <p className="mt-3 max-w-2xl text-muted">Tap any clip to pause. Every clip was filmed on our factory floor.</p>
        <div className="mt-8">
          <ClipReel clips={FACTORY_CLIPS} />
        </div>
      </section>

      <section className="border-t hairline bg-chalk py-16 lg:py-24" aria-labelledby="stages">
        <div className="container-x">
          <h2 id="stages" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
            How a kit is made
          </h2>
          <ol className="mt-10 space-y-14 lg:space-y-20">
            {STAGES.map((s, i) => (
              <li key={s.n} className="grid items-center gap-6 lg:grid-cols-2 lg:gap-14" data-reveal>
                <CaptionedImage src={s.image} alt={s.alt} caption={s.caption} className={i % 2 ? "lg:order-2" : ""} sizes="(min-width:1024px) 50vw, 100vw" />
                <div>
                  <p className="font-mono text-sm text-accent">{s.n}</p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24" aria-labelledby="site">
        <h2 id="site" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
          The site
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <CaptionedImage src="/media/factory/exterior-building.webp" alt="Factory building exterior with paved courtyard" caption="The factory building." />
          <CaptionedImage src="/media/factory/exterior-court.webp" alt="Factory courtyard with parked vehicles under shade canopies" caption="Loading courtyard." />
          <CaptionedImage src="/media/factory/corridor.webp" alt="Bright corridor inside the factory" caption="Inside: offices and production halls." ratio="aspect-[4/3]" />
        </div>
      </section>

      <section className="on-dark bg-ink py-16 text-white lg:py-24" aria-labelledby="quality">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <div>
            <h2 id="quality" className="font-display text-[clamp(2.2rem,7vw,4rem)]">
              Quality you can check
            </h2>
            <p className="mt-4 max-w-lg text-white/70">
              We&apos;d rather show you than claim it. On every first order we make a physical approval sample, and every bulk run is checked
              against it before packing.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              ["Approval sample", "On first orders you sign off a physical sample before bulk production."],
              ["Matched to the sample", "Bulk production follows the approved sample's colours and spec."],
              ["Roster check", "Names, numbers and sizes are checked against your list."],
              ["Checked before packing", "Finished pieces are checked by hand before they're packed per order."],
            ].map(([t, b]) => (
              <li key={t} className="rounded-[var(--radius-card)] border border-white/10 bg-white/[0.03] p-5">
                <p className="font-semibold">{t}</p>
                <p className="mt-1.5 text-sm text-white/60">{b}</p>
              </li>
            ))}
          </ul>
        </div>
        {certs.length > 0 && (
          <div className="container-x mt-12">
            <h3 className="text-xl font-semibold">Certifications</h3>
            <ul className="mt-4 flex flex-wrap gap-3">
              {certs.map((c) => (
                <li key={c.id} className="rounded-xl border border-white/15 px-4 py-3 text-sm">
                  <span className="font-semibold">{c.name}</span>
                  {c.issuer && <span className="text-white/60"> · {c.issuer}</span>}
                  {c.fileUrl && (
                    <a href={c.fileUrl} className="ml-2 text-accent underline" rel="noopener">
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="container-x py-16 text-center lg:py-24">
        <h2 className="font-display text-[clamp(2.2rem,7vw,4rem)]">Want to see your order made?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">Ask us about progress updates while your order is in production.</p>
        <ButtonLink href="/quote" size="lg" className="mt-7" data-track="cta_click" data-track-label="Factory page">
          Start your quote <ArrowRight className="h-4 w-4" aria-hidden />
        </ButtonLink>
      </section>
    </>
  );
}
