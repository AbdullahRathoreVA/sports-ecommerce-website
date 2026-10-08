import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Mail, Plus, Camera } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getAllProducts, getCategories, getFaqs, getPublishedTestimonials } from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/button";
import { HeroJersey } from "@/components/three/jersey-stage";
import { PriceEstimator, type EstimatorProduct } from "@/components/catalog/price-estimator";
import { HeroUnbox } from "@/components/three/unbox-stage";
import { ShippingGlobe } from "@/components/three/globe-stage";
import { FactoryMap } from "@/components/site/factory-map";
import { JsonLd, faqSchema } from "@/components/seo/json-ld";

export const revalidate = 300;

const MARQUEE = ["Factory direct", "Custom OEM", "Kits / Uniforms / Gym wear", "Worldwide shipping", "Samples before bulk", "Your label or ours"];

const OEM_POINTS = ["Logo & artwork", "Colours & patterns", "Fabrics & specs", "Names & numbers"];

const WHY = [
  { title: "Own factory", body: "Printing, cutting, stitching and finishing happen under one roof in Sialkot — no middlemen between you and production." },
  { title: "Samples before bulk", body: "First orders start with an approval sample, so colours, fit and branding are signed off before production." },
  { title: "Everything in writing", body: "Quotes, approvals and order updates are confirmed by email — a clear record for you and for us." },
  { title: "Worldwide shipping", body: "Packed per order and sent by air, sea or express courier, with tracking shared as soon as it ships." },
];

const STEPS = [
  { n: "01", title: "Send your brief", body: "Tell us the product, quantity and branding — or paste your notes and our assistant structures them.", tag: "Quote in writing" },
  { n: "02", title: "Design & sample", body: "We prepare the artwork and, on first orders, a physical sample for your approval.", tag: "Sample approval" },
  { n: "03", title: "Production", body: "Printed, cut and stitched in our factory, with quality checks at every stage.", tag: "QC photos shared" },
  { n: "04", title: "Delivery", body: "Packed per order and shipped to your door, with tracking on your order page.", tag: "Air · sea · courier" },
];

const SWATCHES = ["#c8231a", "#1f3fe0", "#111214", "#e8b100"];

const NUMBER_WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="label text-subtle">
      {n} / {children}
    </p>
  );
}

export default async function HomePage() {
  const [settings, categories, products, faqs, testimonials] = await Promise.all([getSettings(), getCategories(), getAllProducts(), getFaqs(), getPublishedTestimonials()]);
  const topFaqs = faqs.slice(0, 6);
  const byCategory = new Map<string, string[]>();
  for (const p of products) byCategory.set(p.category.slug, [...(byCategory.get(p.category.slug) ?? []), p.name]);
  // Featured first, then anything with quantity price breaks.
  const estimator: EstimatorProduct[] = [...products]
    .filter((p) => p.priceTiers.length > 0)
    .sort((x, y) => Number(y.featured) - Number(x.featured) || x.position - y.position)
    .slice(0, 12)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category.name,
      image: p.image?.url ?? null,
      tiers: p.priceTiers,
      moq: p.moq,
      currency: p.currency,
      leadMin: p.leadTimeMinDays,
      leadMax: p.leadTimeMaxDays,
      sampleCents: p.samplePriceCents,
    }));

  // Hero strip: verified company facts when the factory has supplied them, otherwise plain capabilities.
  const facts = [
    settings.facts.founded && { value: settings.facts.founded, label: "Established" },
    settings.facts.exportMarkets && { value: settings.facts.exportMarkets, label: "Export markets" },
    settings.facts.monthlyCapacity && { value: settings.facts.monthlyCapacity, label: "Monthly capacity" },
    settings.facts.teamSize && { value: settings.facts.teamSize, label: "Team" },
  ].filter(Boolean) as { value: string; label: string }[];
  const exportCount = /^(\d+\+?)/.exec(settings.facts.exportMarkets)?.[1];
  const strip = facts.length >= 3
    ? facts
    : [
        exportCount ? { value: exportCount, label: "Countries exported to" } : { value: "Sialkot", label: "Own factory, Pakistan" },
        { value: "OEM", label: "Private label" },
        { value: "Samples", label: "Before bulk orders" },
        exportCount ? { value: "Sialkot", label: "Own factory, Pakistan" } : { value: "Worldwide", label: "Air · sea · courier" },
      ];

  return (
    <>
      {topFaqs.length > 0 && <JsonLd data={faqSchema(topFaqs)} />}

      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="on-dark relative -mt-[calc(var(--header-h)+12px)] overflow-hidden bg-ink pt-[calc(var(--header-h)+12px)]">
        <div className="grid-lines pointer-events-none absolute inset-0 [mask-image:radial-gradient(70%_60%_at_70%_40%,black,transparent)]" />
        <div className="container-x relative grid items-center gap-8 pb-10 pt-8 lg:min-h-[640px] lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pb-14 lg:pt-12">
          <div className="animate-rise">
            <p className="label flex items-center gap-2 text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> Custom sportswear manufacturer · Sialkot
            </p>
            <h1 className="font-display mt-6 text-[clamp(3rem,10vw,6.2rem)]">
              Your vision.
              <span className="block text-accent">Our creation.</span>
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-[16px] leading-relaxed text-white/65 sm:text-[17px]">
              Team kits, uniforms and sportswear — designed, sublimated and stitched in our own factory in Sialkot and shipped worldwide.
              We make to your wishes, under your label or ours.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/quote" size="lg" data-track="cta_click" data-track-label="Hero: Get a quote">
                Get a Quote <ArrowUpRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/products" size="lg" variant="outline-light" data-track="cta_click" data-track-label="Hero: Browse catalog">
                Browse Catalog <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/55">
              {["Factory direct", "Custom OEM", "Samples before bulk"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-accent" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:-mr-10">
            <div className="label flex justify-between text-white/40">
              <span>Alrobel / Made &amp; shipped</span>
              <span>01 — 03</span>
            </div>
            <div className="relative">
              <div className="signal-glow pointer-events-none absolute inset-[10%]" />
              <HeroUnbox poster="/media/hero/unbox-poster.webp" posterAlt="An Alrobel shipping box opening with three finished team kits rising out of it" className="relative mx-auto aspect-[1.08] w-full" />
              <Link
                href="/design-studio"
                className="absolute bottom-6 right-0 hidden max-w-[230px] items-start gap-3 rounded-md border border-white/10 bg-ink/90 p-3 backdrop-blur transition-colors hover:border-accent sm:flex"
                data-track="customizer_start"
                data-track-label="Hero card"
              >
                <Plus className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-white">Made for your brand.</span>
                  <span className="mt-0.5 block text-xs text-white/50">Tap a kit to design yours in 3D</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Strip */}
        <div className="container-x relative">
          <div className="grid grid-cols-2 gap-px border-t border-white/10 lg:grid-cols-[auto_1fr_1fr_1fr_1fr]">
            <a href="#product-lines" className="label hidden items-center gap-2 py-6 pr-10 text-white/60 hover:text-white lg:flex">
              <ArrowDown className="h-4 w-4 text-accent" aria-hidden /> Explore the
              <br /> collection
            </a>
            {strip.map((f) => (
              <div key={f.label} className="flex items-baseline gap-3 py-5 lg:py-6">
                <span className="text-[clamp(1.4rem,3vw,2rem)] font-semibold tracking-tight">{f.value}</span>
                <span className="label text-[0.62rem] text-white/45">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-hidden border-t border-white/10 bg-ink-2">
          <div className="flex w-max animate-marquee gap-12 py-4">
            {[...MARQUEE, ...MARQUEE].map((t, i) => (
              <span key={i} className="label flex items-center gap-12 text-white/55">
                {t} <span className="text-accent" aria-hidden>✱</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 01 Product lines ───────────────────────────────────────────── */}
      <section id="product-lines" className="py-20 lg:py-28" aria-labelledby="cats">
        <div className="container-x">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between" data-reveal>
            <div>
              <SectionLabel n="01">Product lines</SectionLabel>
              <h2 id="cats" className="font-display mt-5 text-[clamp(2.4rem,7vw,4.4rem)]">
                {categories.length > 1 && categories.length < 10 ? `${NUMBER_WORDS[categories.length]} product lines.` : "Our product lines."}
                <span className="block text-subtle">One factory standard.</span>
              </h2>
            </div>
            <Link href="/products" className="inline-flex items-center gap-8 border-b border-fg pb-2 text-sm font-semibold hover:text-accent">
              View all products <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-12 grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c, i) => (
              <li key={c.slug} data-reveal style={{ "--reveal-delay": `${(i % 3) * 70}ms` } as React.CSSProperties}>
                <Link href={`/products/c/${c.slug}`} className="group block" data-track="category_view" data-category={c.slug}>
                  <div className="relative aspect-[4/3.3] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
                    {c.image && (
                      <Image src={c.image} alt={c.imageAlt ?? ""} fill sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 92vw" className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <span className="label absolute left-4 top-4 text-white/70">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="absolute bottom-4 left-5 text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-tight text-white">{c.name}</h3>
                  </div>
                  <p className="mt-4 text-[15px] font-medium">{c.tagline}</p>
                  <ul className="mt-2 space-y-1 text-[13px] text-muted">
                    {(byCategory.get(c.slug) ?? []).slice(0, 3).map((n) => (
                      <li key={n} className="flex gap-2">
                        <span className="text-accent" aria-hidden>
                          +
                        </span>
                        {n}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-5 flex items-center justify-between border-b hairline pb-2 text-sm font-semibold transition-colors group-hover:border-fg">
                    Explore {c.shortName ?? c.name} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {estimator.length > 0 && (
            <div id="estimate" className="mt-20 scroll-mt-28 lg:mt-28" data-reveal>
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <h3 className="font-display text-[clamp(2rem,5vw,3.2rem)] leading-[0.95]">
                  Price it in seconds.
                  <span className="block text-subtle">No email, no waiting.</span>
                </h3>
                <p className="max-w-sm text-[15px] text-muted">Pick a product and a quantity to see your per-piece price and bulk savings instantly.</p>
              </div>
              <PriceEstimator products={estimator} indicative={settings.demoMode} />
            </div>
          )}
        </div>
      </section>

      {/* ─── 02 Custom OEM ──────────────────────────────────────────────── */}
      <section className="on-dark bg-ink py-20 lg:py-28" aria-labelledby="oem">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div data-reveal>
            <p className="label text-white/60">02 / Custom OEM</p>
            <h2 id="oem" className="font-display mt-5 text-[clamp(2.4rem,7vw,4.4rem)]">
              Your brand.
              <span className="block">Your colours.</span>
              <span className="block text-accent">Our factory.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/60">
              From the first colourway to the final stitch. Kits, tracksuits, hoodies and uniforms made with your logo, colours, labels and
              packaging — we stay invisible.
            </p>
            <ul className="mt-7 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 text-sm text-white/80">
              {OEM_POINTS.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-accent" aria-hidden /> {t}
                </li>
              ))}
            </ul>
            <Link href="/oem" className="mt-9 inline-flex items-center gap-8 border-b border-white pb-2 text-sm font-semibold hover:text-accent" data-track="oem_cta">
              Custom Orders <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {/* A div, not a link: the 3D kit can be dragged to spin without navigating. */}
          <div className="group relative rounded-lg border border-white/10 bg-ink-2 transition-colors hover:border-white/25" data-reveal>
            <div className="label flex items-center justify-between border-b border-white/10 px-5 py-4 text-white/50">
              OEM / Design studio
              <span className="flex items-center gap-2 text-[0.6rem] text-white/45">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden /> Live 3D
              </span>
            </div>
            <div className="grid-lines relative aspect-[16/11] cursor-grab overflow-hidden active:cursor-grabbing">
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-3xl" aria-hidden />
              <HeroJersey poster="/media/hero/jersey-poster.webp" posterAlt="A football kit being designed in the 3D Design Studio" className="absolute inset-0" />
              <Link
                href="/design-studio"
                className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-2 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-accent-hover"
                data-track="customizer_start"
                data-track-label="OEM card"
              >
                Design your kit <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-5 border-t border-white/10 px-5 py-5">
              <div>
                <p className="label text-[0.62rem] text-white/45">01 / Colourway</p>
                <div className="mt-3 flex gap-2">
                  {SWATCHES.map((c, i) => (
                    <span key={c} className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-ink-2 ${i === 0 ? "ring-2 ring-white/80" : "ring-1 ring-white/25"}`} style={{ background: c }} aria-hidden />
                  ))}
                </div>
              </div>
              <div>
                <p className="label text-[0.62rem] text-white/45">02 / Your branding</p>
                <p className="label mt-3 border-b border-white/15 pb-2 text-white/70">Your brand</p>
              </div>
            </div>
            <p className="px-5 pb-5 text-xs text-white/45">
              <Link href="/design-studio" className="font-semibold text-white hover:text-accent">Open the Design Studio</Link>: pick colours and patterns, add names and numbers, and send the design with your quote.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 03 Why choose us ───────────────────────────────────────────── */}
      <section className="bg-chalk py-20 lg:py-28" aria-labelledby="why">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end" data-reveal>
            <div>
              <SectionLabel n="03">Factory direct</SectionLabel>
              <h2 id="why" className="font-display mt-5 text-[clamp(2.4rem,7vw,4.4rem)]">
                Behind every order.
                <span className="block text-subtle">Checked at every step.</span>
              </h2>
            </div>
            <p className="max-w-sm text-[15px] leading-relaxed text-muted">We handle design, sampling, production and shipping — so you can focus on your team or your brand.</p>
          </div>
          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <figure className="relative aspect-[10/7] overflow-hidden rounded-[var(--radius-card)] bg-ink" data-reveal>
              <Image src="/media/factory/printer-panels.webp" alt="Jersey panels coming off a large-format sublimation printer in the factory" fill sizes="(min-width:1024px) 45vw, 92vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <figcaption className="absolute bottom-5 left-6 text-white">
                <span className="label text-white/60">Print room / sublimation</span>
                <span className="mt-1 block text-xl font-semibold tracking-tight">Quality is in the details.</span>
              </figcaption>
            </figure>
            <div data-reveal>
              <p className="label text-subtle">Why choose us</p>
              <div className="mt-5 border-t hairline">
                {WHY.map((w, i) => (
                  <details key={w.title} className="group border-b hairline" open={i === 0}>
                    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 py-4 [&::-webkit-details-marker]:hidden">
                      <span className="label text-[0.62rem] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex-1 text-xl font-medium tracking-tight">{w.title}</span>
                      <Plus className="h-5 w-5 transition-transform group-open:rotate-45" aria-hidden />
                    </summary>
                    <p className="pb-5 pl-9 pr-8 text-[15px] leading-relaxed text-muted">{w.body}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* From order to your door */}
          <div className="mt-24 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" data-reveal>
            <h2 className="text-[clamp(1.8rem,4vw,2.6rem)] font-medium tracking-tight">
              From order <span className="text-subtle">to your door.</span>
            </h2>
            <Link href="/quote" className="inline-flex items-center gap-8 border-b border-fg pb-2 text-sm font-semibold hover:text-accent">
              Start your order <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.n} className="border-t border-fg/30 pt-6" data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}>
                <div className="flex items-start justify-between">
                  <span className="text-5xl font-light tracking-tight">{s.n}</span>
                  <ArrowRight className="h-5 w-5 text-subtle" aria-hidden />
                </div>
                <h3 className="mt-6 text-[17px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.body}</p>
                <span className="label mt-5 inline-block border border-fg/25 px-2 py-1 text-[0.6rem] text-fg/80">{s.tag}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── 04 Order tracking ──────────────────────────────────────────── */}
      <section className="on-dark bg-ink py-20 lg:py-28" aria-labelledby="track">
        <div className="container-x grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div data-reveal>
            <p className="label flex items-center gap-2 text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> 04 / Order tracking
            </p>
            <h2 id="track" className="font-display mt-5 text-[clamp(2.4rem,7vw,4.4rem)]">
              Your order.
              <span className="block">Always in view.</span>
              <span className="block text-white/40">Always on record.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/60">
              Every order gets a private tracking page with its status, quality-check and packing photos, and every confirmation by email —
              so there is never any doubt about what was agreed.
            </p>
            <ButtonLink href="/track" size="lg" className="mt-8" data-track="cta_click" data-track-label="Home: Track order">
              Track an order <ArrowUpRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>

          {/* Illustration of the real order page (sample data). */}
          <div className="rounded-lg bg-[#f4f3ef] p-4 text-ink shadow-2xl shadow-black/40 sm:p-6" data-reveal aria-hidden>
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-black/20" />
                <span className="h-2.5 w-2.5 rounded-full border border-black/20" />
                <span className="h-2.5 w-2.5 rounded-full border border-black/20" />
              </span>
              <span className="label text-[0.62rem] text-black/60">Order AL-261007-K3P9</span>
              <span className="label flex items-center gap-1.5 text-[0.6rem] text-black/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
              </span>
            </div>
            <div className="mt-5 rounded-md bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="label text-[0.58rem] text-black/45">120 × custom football kits</p>
                  <p className="mt-1 font-semibold">Teamwear production</p>
                </div>
                <span className="label rounded-sm bg-[#fde7e5] px-2 py-1 text-[0.58rem] text-[#a81c14]">In production</span>
              </div>
              <div className="mt-6 flex items-center">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex flex-1 items-center last:flex-none">
                    <span className={`grid h-6 w-6 place-items-center rounded-full ${n < 4 ? "bg-[#c8231a] text-white" : "border-2 border-black/15 bg-white"}`}>{n < 4 && <Check className="h-3.5 w-3.5" />}</span>
                    {n < 4 && <span className={`h-[2px] flex-1 ${n < 3 ? "bg-[#c8231a]" : "bg-black/10"}`} />}
                  </div>
                ))}
              </div>
              <div className="label mt-2 flex justify-between text-[0.55rem] text-black/45">
                <span>Received</span>
                <span>Confirmed</span>
                <span>Production</span>
                <span>Shipped</span>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-md bg-white p-3 shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-black/5">
                  <Camera className="h-4 w-4" />
                </span>
                <span>
                  <span className="label block text-[0.55rem] text-black/45">QC photos</span>
                  <span className="text-sm font-semibold">6 photos shared</span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-md bg-white p-3 shadow-sm">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-black/5">
                  <Mail className="h-4 w-4" />
                </span>
                <span>
                  <span className="label block text-[0.55rem] text-black/45">Email record</span>
                  <span className="text-sm font-semibold">Approval confirmed</span>
                </span>
              </div>
            </div>
            <p className="label mt-4 text-right text-[0.55rem] text-black/40">Sample view</p>
          </div>
        </div>
      </section>

      {/* ─── 05 Global shipping ─────────────────────────────────────────── */}
      <section className="on-dark relative overflow-hidden border-t border-white/10 bg-ink py-20 lg:py-28" aria-labelledby="global">
        <div className="container-x grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div data-reveal>
            <p className="label text-white/60">05 / Global shipping</p>
            <h2 id="global" className="font-display mt-5 max-w-3xl text-[clamp(2.4rem,7vw,4.4rem)]">
              Made in Sialkot.
              <span className="block">Shipped worldwide.</span>
            </h2>
            <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/60">
              Our factory handles packing, export paperwork and shipping — by sea, air or express courier, door to door. Customers in the USA,
              the UK, Europe, the Gulf and beyond receive their kits straight from Sialkot.
            </p>
            <ul className="mt-8 grid max-w-md grid-cols-2 gap-x-6 gap-y-3">
              {["USA", "United Kingdom", "Europe", "Gulf & Middle East"].map((r) => (
                <li key={r} className="flex items-center gap-2.5 border-b border-white/10 pb-3 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> {r}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-white/40">And more — ask us about shipping to your country.</p>
          </div>
          <div className="relative" data-reveal>
            <ShippingGlobe
              origin={{ name: "Sialkot", lat: 32.49, lon: 74.53 }}
              destinations={[
                { name: "New York", lat: 40.71, lon: -74.0 },
                { name: "Los Angeles", lat: 34.05, lon: -118.24 },
                { name: "London", lat: 51.5, lon: -0.13 },
                { name: "Berlin", lat: 52.52, lon: 13.4 },
                { name: "Dubai", lat: 25.2, lon: 55.27 },
              ]}
              className="mx-auto w-full max-w-[560px]"
            />
            <p className="label text-center text-[0.6rem] text-white/35">Drag to spin the globe</p>
          </div>
        </div>
        <div className="container-x mt-14">
          <dl className="grid grid-cols-2 gap-8 border-t border-white/10 pt-8 lg:grid-cols-4">
            {strip.map((f) => (
              <div key={f.label}>
                <dt className="sr-only">{f.label}</dt>
                <dd className="text-[clamp(2rem,5vw,3.4rem)] font-medium tracking-tight">{f.value}</dd>
                <dd className="label mt-1 text-[0.62rem] text-white/45">{f.label}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:items-stretch">
            <div className="flex flex-col justify-between rounded-[var(--radius-card)] border border-white/10 p-6">
              <div>
                <p className="label text-accent">Factory & office</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{[settings.contact.addressLine, settings.contact.city, settings.contact.country].filter(Boolean).join(", ") || "Sialkot, Pakistan"}</p>
                <p className="mt-3 text-sm text-white/55">Fabric, design, sublimation and stitching — all under one roof, from where every order ships.</p>
              </div>
              <Link href="/contact" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
                Contact the factory <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <FactoryMap
              address={[settings.contact.addressLine, settings.contact.city, settings.contact.country].filter(Boolean).join(", ") || "Sialkot, Pakistan"}
              mapsUrl={settings.contact.mapsUrl || undefined}
              className="min-h-[300px]"
            />
          </div>
        </div>
      </section>

      {/* ─── 06 Client stories (only real, published testimonials) ──────── */}
      {testimonials.length > 0 && (
        <section className="py-20 lg:py-28" aria-labelledby="stories">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div data-reveal>
              <SectionLabel n="06">Client stories</SectionLabel>
              <h2 id="stories" className="font-display mt-5 text-[clamp(2.2rem,5vw,3.4rem)]">
                Trusted by
                <span className="block text-subtle">our partners.</span>
              </h2>
            </div>
            <ul className="space-y-10" data-reveal>
              {testimonials.slice(0, 3).map((t) => (
                <li key={t.id} className="border-b hairline pb-8">
                  <blockquote className="text-[clamp(1.2rem,2.4vw,1.7rem)] leading-snug">&ldquo;{t.quote}&rdquo;</blockquote>
                  <p className="mt-5 text-sm font-semibold">{t.author}</p>
                  <p className="text-xs text-muted">{[t.role, t.company, t.country].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── FAQ ────────────────────────────────────────────────────────── */}
      {topFaqs.length > 0 && (
        <section className="py-20 lg:py-28" aria-labelledby="faq">
          <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <div data-reveal>
              <SectionLabel n={testimonials.length > 0 ? "07" : "06"}>Questions</SectionLabel>
              <h2 id="faq" className="font-display mt-5 text-[clamp(2.2rem,5vw,3.4rem)]">
                Before you
                <span className="block text-subtle">place an order.</span>
              </h2>
            </div>
            <div className="border-t hairline" data-reveal>
              {topFaqs.map((f) => (
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

      {/* ─── Final CTA ──────────────────────────────────────────────────── */}
      <section className="on-dark relative overflow-hidden bg-ink py-20 lg:py-28">
        <ArrowUpRight className="pointer-events-none absolute -right-6 top-10 hidden h-72 w-72 stroke-[1.2] text-white/[0.06] lg:block" aria-hidden />
        <div className="container-x relative" data-reveal>
          <p className="label text-white/60">Ready to start</p>
          <h2 className="font-display mt-5 text-[clamp(2.8rem,9vw,5.6rem)]">
            Ready to kit out
            <span className="block text-accent">your team?</span>
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-white/60">
            {settings.contact.responseTime || "We reply to every enquiry within one working day."} Tell us what you need — we&apos;ll come back with a
            written quote.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/quote" size="lg" data-track="cta_click" data-track-label="Final CTA: Get a quote">
              Get a Quote <ArrowUpRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/products" size="lg" variant="outline-light" data-track="cta_click" data-track-label="Final CTA: Browse catalog">
              Browse Catalog <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
