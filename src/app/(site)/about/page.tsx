import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Globe2, Handshake, MapPin, PenTool, Scissors, ShieldCheck, Shirt, Sparkles, Wand2 } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getPublishedCertifications } from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Alrobel Sportswear is a custom sportswear manufacturer in Sialkot, Pakistan — fabric, design, sublimation and stitching under one roof, exporting worldwide.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: ShieldCheck, title: "Quality first", body: "Every order is checked before dispatch, and QC and packing photos are shared on your order page." },
  { icon: Handshake, title: "Customer partnership", body: "Quotes, approvals and updates are confirmed in writing — clear for you and for us." },
  { icon: Globe2, title: "Global reach", body: "Packed per order and shipped to your door by air, sea or express courier." },
  { icon: Wand2, title: "Made to your wishes", body: "Your logos, colours, designs, labels, tags and packaging — on every product we make." },
];

const CRAFT = [
  { icon: Shirt, title: "Fabric", body: "Performance fabrics chosen for the sport, the climate and your budget." },
  { icon: PenTool, title: "Design", body: "Artwork and patterns prepared by our team, or built from your own files." },
  { icon: Sparkles, title: "Sublimation", body: "Full-colour designs dyed into the fabric, so they never crack or peel." },
  { icon: Scissors, title: "Stitching", body: "Cut and sewn in our own factory and checked against your approved sample." },
];

export default async function AboutPage() {
  const [s, certs] = await Promise.all([getSettings(), getPublishedCertifications()]);
  const exportCount = /^(\d+\+?)/.exec(s.facts.exportMarkets)?.[1];
  const stats = [
    exportCount && { value: exportCount, label: "Countries exported to" },
    s.facts.founded && { value: s.facts.founded, label: "Founded" },
    { value: "Sialkot", label: "Own factory" },
    { value: "OEM", label: "Private label" },
    { value: "Samples", label: "Before bulk" },
  ]
    .filter(Boolean)
    .slice(0, 4) as { value: string; label: string }[];
  const address = [s.contact.addressLine, s.contact.city, s.contact.country].filter(Boolean).join(", ");

  return (
    <>
      {/* Story hero */}
      <section className="on-dark relative -mt-[calc(var(--header-h)+12px)] overflow-hidden bg-ink pt-[calc(var(--header-h)+12px)]">
        <div className="container-x grid gap-10 py-14 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <p className="label flex items-center gap-2 text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> Our story / {s.brand.name}
            </p>
            <h1 className="font-display mt-6 text-[clamp(2.8rem,8vw,5rem)]">
              Custom sportswear,
              <span className="block text-accent">made to your wishes.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-white/65">{s.brand.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <ButtonLink href="/contact" size="lg">
                Contact us <ArrowUpRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <a href="#values" className="inline-flex items-center gap-2 border-b border-white/40 pb-1 text-sm font-semibold text-white hover:border-white">
                Our values <ArrowDown className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
          <figure className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-ink-3">
            <Image src="/media/factory/print-room.webp" alt="Sublimation printers in our print room" fill priority sizes="(min-width:1024px) 50vw, 92vw" className="object-cover" />
            <figcaption className="label absolute bottom-4 left-4 flex items-center gap-2 rounded-sm bg-ink/85 px-3 py-2 text-white/80 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden /> Sialkot · Pakistan
            </figcaption>
          </figure>
        </div>
        <dl className="container-x grid grid-cols-2 border-t border-white/10 lg:grid-cols-4">
          {stats.map((st, i) => (
            <div key={st.label} className="border-white/10 py-6 pr-6 lg:border-l lg:pl-6 lg:first:border-l-0 lg:first:pl-0">
              <dd className="text-[clamp(1.9rem,4vw,2.8rem)] font-medium tracking-tight">{st.value}</dd>
              <dt className="label mt-1 text-[0.62rem] text-white/45">
                {String(i + 1).padStart(2, "0")} · {st.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Values */}
      <section id="values" className="scroll-mt-24 py-16 lg:py-24">
        <div className="container-x">
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr_1fr] lg:items-end">
            <p className="label text-accent">Our story</p>
            <h2 className="font-display text-[clamp(2.4rem,6vw,4rem)] lg:text-center">Our values</h2>
            <p className="text-sm text-muted lg:text-right">The principles behind every order.</p>
          </div>
          <div className="mt-10 grid overflow-hidden rounded-[var(--radius-card)] border hairline lg:grid-cols-2">
            <div className="relative min-h-[320px] bg-surface-2">
              <Image src="/media/work/royal-saints-trio.webp" alt="Three finished team kits from our factory" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col justify-between bg-chalk p-8 lg:p-12">
              <p className="label text-subtle">01 — Our foundation</p>
              <p className="mt-6 text-[clamp(1.4rem,2.6vw,2rem)] leading-snug tracking-tight">
                We make sportswear to your wishes — fabric, design, sublimation and stitching, all under one roof in {s.contact.city || "Sialkot"}.
              </p>
              <p className="mt-8 border-t hairline pt-5 text-sm text-muted">
                <span className="font-semibold text-fg">{s.brand.name}</span> · Your vision, our creation.
              </p>
            </div>
          </div>
          <ul className="grid border-x border-b hairline sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <li key={v.title} className="border-t hairline bg-surface p-6 sm:[&:nth-child(even)]:border-l lg:border-l lg:first:border-l-0">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <v.icon className="h-5 w-5 text-accent" aria-hidden />
                </div>
                <h3 className="mt-10 text-[17px] font-semibold">{v.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{v.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What we do */}
      <section className="on-dark bg-ink py-16 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="label text-accent">Under one roof</p>
            <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4rem)]">
              From fabric
              <span className="block text-white/45">to finished kit.</span>
            </h2>
            <p className="mt-5 max-w-sm text-white/60">Every step happens in our own factory, so we control quality and timing from the first cut to the final stitch.</p>
          </div>
          <ul className="border-t border-white/10">
            {CRAFT.map((c, i) => (
              <li key={c.title} className="flex items-start gap-5 border-b border-white/10 py-6">
                <span className="font-mono text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span>
                <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="block text-lg font-medium">{c.title}</span>
                  <span className="mt-1 block text-[14px] text-white/55">{c.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Certifications (only verified, published ones) */}
      {certs.length > 0 && (
        <section className="py-16 lg:py-24">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="label text-accent">Quality assurance</p>
              <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4rem)]">Certifications</h2>
            </div>
            <ul className="border-t hairline">
              {certs.map((c, i) => (
                <li key={c.id} className="flex gap-5 border-b hairline py-5">
                  <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="block text-lg font-semibold">{c.name}</span>
                    <span className="mt-1 block text-sm text-muted">{[c.issuer, c.reference && `Certificate ${c.reference}`].filter(Boolean).join(" · ")}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Leadership */}
      <section className="bg-chalk py-16 lg:py-24">
        <div className="container-x">
          <div className="grid gap-4 lg:grid-cols-[1fr_2fr_1fr] lg:items-end">
            <p className="label text-accent">People behind the product</p>
            <h2 className="font-display text-[clamp(2.4rem,6vw,4rem)] lg:text-center">Leadership</h2>
            <p className="text-sm text-muted lg:text-right">The people who answer for every order.</p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-[var(--radius-card)] border hairline bg-surface p-3">
              <div className="grid aspect-[4/3.4] place-items-center rounded-sm bg-surface-2">
                <span className="grid h-32 w-32 place-items-center rounded-full border hairline text-4xl font-medium tracking-tight">SA</span>
              </div>
              <p className="mt-4 px-2 font-semibold">Mian Sajid Abbas</p>
              <p className="px-2 pb-2 text-sm text-muted">Managing Director</p>
            </li>
          </ul>
        </div>
      </section>

      {/* HQ */}
      <section className="py-16 lg:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="label text-accent">Headquarters</p>
            <h2 className="font-display mt-5 text-[clamp(2.4rem,6vw,4rem)]">
              Based in Sialkot.
              <span className="block text-subtle">Serving the world.</span>
            </h2>
            <p className="mt-5 max-w-md text-muted">
              Our factory is in Sialkot, Pakistan&apos;s sports-manufacturing city, shipping to customers in the USA, the UK, Europe, the Gulf and beyond.
            </p>
            <ButtonLink href="/contact" variant="dark" size="lg" className="mt-8">
              Contact our team <ArrowUpRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="on-dark rounded-[var(--radius-card)] bg-ink p-8 text-white">
            <p className="label text-white/50">Factory & office</p>
            <p className="mt-4 flex items-start gap-3 text-xl font-medium">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-accent" aria-hidden /> {address || "Sialkot, Pakistan"}
            </p>
            {s.contact.hours && <p className="mt-3 text-sm text-white/55">{s.contact.hours}</p>}
            {s.contact.mapsUrl && (
              <a href={s.contact.mapsUrl} rel="noopener" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                Open in Google Maps <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
