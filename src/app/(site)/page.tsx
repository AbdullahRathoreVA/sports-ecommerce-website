import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Factory, Layers, PenTool, Scissors, Sparkles, Tag } from "lucide-react";
import { getSettings, whatsappLink } from "@/lib/settings";
import { getAllProducts, getCategories, getFaqs } from "@/lib/catalog";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { HeroJersey } from "@/components/three/jersey-stage";
import { ClipReel, FACTORY_CLIPS } from "@/components/media/clip-reel";
import { AskChips } from "@/components/assistant/ask-chips";
import { FilmButton } from "@/components/media/film-player";
import { JsonLd, faqSchema } from "@/components/seo/json-ld";

export const revalidate = 300;

const CAPABILITIES = [
  { icon: PenTool, title: "Own print room", body: "Large-format sublimation printers and heat presses, in-house." },
  { icon: Layers, title: "Embroidery", body: "Multi-head embroidery machines for crests and logos." },
  { icon: Scissors, title: "Cut & sew", body: "Our own stitching halls — nothing outsourced." },
  { icon: Tag, title: "Your label", body: "Private label: neck tape, labels, tags and packing." },
];

const STEPS = [
  { n: "01", title: "Brief", body: "Tell us what you need — or paste your requirements and our assistant structures them." },
  { n: "02", title: "Design & sample", body: "We prepare artwork and, on first orders, a physical approval sample." },
  { n: "03", title: "Production", body: "Printed, cut, stitched and checked in our own factory." },
  { n: "04", title: "Delivery", body: "Packed per order and shipped by air, sea or express courier." },
];

const AUDIENCES = [
  { title: "Teams & clubs", body: "Match kits, keeper kits, training wear and tracksuits — names and numbers per player.", href: "/industries#teams" },
  { title: "Brands & private label", body: "Your patterns, labels and packaging. We stay invisible.", href: "/industries#brands" },
  { title: "Retailers & wholesalers", body: "Leather jackets, gloves and race suits for your shelves, in volume.", href: "/industries#retail" },
  { title: "Riders & race teams", body: "Leathers, kart suits and gloves in your livery — standard sizes or made to measure.", href: "/industries#motorsport" },
];

const WORK = [
  { src: "/media/work/royal-saints-marble.webp", alt: "Black and gold marble goalkeeper kit", caption: "Marble goalkeeper kit" },
  { src: "/media/work/rjc-stripes.webp", alt: "Blue and white striped football kit", caption: "Classic stripes" },
  { src: "/media/work/purity-back.webp", alt: "Back of a blue shirt printed with sponsor, name and number", caption: "Names & numbers printed in" },
  { src: "/media/work/ovamill-yellow.webp", alt: "Yellow and black sponsored football kit", caption: "Sponsor-ready kits" },
  { src: "/media/work/tfc-orange.webp", alt: "Orange sublimated match jersey on a mannequin", caption: "Pro-fit match jersey" },
  { src: "/media/work/rjc-goalkeeper.webp", alt: "Green speckled long-sleeve goalkeeper kit", caption: "Keeper camo" },
];

export default async function HomePage() {
  const [settings, categories, products, faqs] = await Promise.all([getSettings(), getCategories(), getAllProducts(), getFaqs()]);
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const wa = whatsappLink(settings, `Hi ${settings.brand.name}, I'd like a quote.`);
  const facts = [
    settings.facts.founded && { label: "Established", value: settings.facts.founded },
    settings.facts.teamSize && { label: "Team", value: settings.facts.teamSize },
    settings.facts.monthlyCapacity && { label: "Monthly capacity", value: settings.facts.monthlyCapacity },
    settings.facts.exportMarkets && { label: "Export markets", value: settings.facts.exportMarkets },
  ].filter(Boolean) as { label: string; value: string }[];
  const topFaqs = faqs.slice(0, 5);

  return (
    <>
      {topFaqs.length > 0 && <JsonLd data={faqSchema(topFaqs)} />}

      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="on-dark relative overflow-hidden bg-ink text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(55% 50% at 74% 44%, rgba(205,245,74,0.16), transparent 70%), radial-gradient(40% 40% at 8% 92%, rgba(120,140,170,0.16), transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(70% 60% at 60% 40%, black, transparent)",
          }}
        />
        <div className="container-x relative grid items-center gap-6 pb-10 pt-10 lg:min-h-[calc(100svh-var(--header-h)-36px)] lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:py-16">
          <div className="animate-rise">
            <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-white/75">
              <Factory className="h-3.5 w-3.5 text-accent" aria-hidden />
              <span className="sm:hidden">Manufacturer · own factory</span>
              <span className="hidden sm:inline">Manufacturer & wholesaler · own factory</span>
            </p>
            <h1 className="font-display mt-5 text-balance text-[clamp(3.1rem,13vw,7.6rem)]">
              Made for the pitch, the <span className="text-accent">grid</span> and the street.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-[17px] leading-relaxed text-white/70 sm:text-lg">
              Sublimated teamwear, leather racing suits, gloves and jackets — designed with you, printed, cut and stitched in our own
              factory, under your label or ours.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/quote" size="lg" data-track="cta_click" data-track-label="Hero: Get a quote">
                Get a quote <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
              <ButtonLink href="/design-studio" size="lg" variant="outline-light" data-track="cta_click" data-track-label="Hero: Design your kit">
                Design your kit in 3D
              </ButtonLink>
            </div>
            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
              {["Samples before bulk", "Private label", "Names & numbers per player"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-accent" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          <HeroJersey
            poster="/media/hero/jersey-poster.webp"
            posterAlt="Sublimated football jersey rendered in 3D"
            className="mx-auto aspect-square w-full max-w-[560px] lg:max-w-none"
          />
        </div>

        <div className="relative border-t border-white/10">
          <ul className="container-x grid grid-cols-2 gap-px lg:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 py-5 pr-4 lg:py-6">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-white/55">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Categories ─────────────────────────────────────────────────── */}
      <section className="container-x py-16 lg:py-24" aria-labelledby="cats">
        <div className="flex items-end justify-between gap-4" data-reveal>
          <div>
            <p className="eyebrow text-accent">What we make</p>
            <h2 id="cats" className="font-display mt-3 text-[clamp(2.2rem,7vw,4rem)]">
              Six lines. One factory.
            </h2>
          </div>
          <Link href="/products" className="hidden items-center gap-1.5 text-sm font-semibold text-fg hover:text-accent sm:inline-flex">
            All products <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="scrollbar-none snap-x-mandatory -mx-4 mt-8 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0">
          {categories.map((c, i) => (
            <li key={c.slug} className="snap-start-always w-[78vw] max-w-[340px] shrink-0 lg:w-auto lg:max-w-none" data-reveal style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}>
              <Link
                href={`/products/c/${c.slug}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-ink-3 p-5 text-white lg:aspect-[5/4]"
                data-track="category_view"
                data-category={c.slug}
              >
                {c.image && (
                  <Image
                    src={c.image}
                    alt={c.imageAlt ?? ""}
                    fill
                    sizes="(min-width: 1024px) 30vw, 78vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="relative">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-white/65">
                    {c.productCount} {c.productCount === 1 ? "product" : "products"}
                  </p>
                  <h3 className="font-display mt-1.5 text-[1.9rem]">{c.name}</h3>
                  <p className="mt-1 flex items-center justify-between gap-3 text-sm text-white/75">
                    {c.tagline}
                    <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Inside the factory ─────────────────────────────────────────── */}
      <section className="on-dark bg-ink py-16 text-white lg:py-24" aria-labelledby="factory">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end" data-reveal>
            <div>
              <p className="eyebrow text-accent">Inside the factory · real footage</p>
              <h2 id="factory" className="font-display mt-3 max-w-3xl text-[clamp(2.2rem,7vw,4.2rem)]">
                From your file to finished kit. Under one roof.
              </h2>
              <p className="mt-4 max-w-2xl text-white/65">
                No middlemen, no outsourced printing. These are our own printers, presses and stitching halls — filmed on the factory floor.
              </p>
            </div>
            <FilmButton />
          </div>
          <div className="mt-10" data-reveal>
            <ClipReel clips={FACTORY_CLIPS} />
          </div>
        </div>
      </section>

      {/* ─── Featured products ──────────────────────────────────────────── */}
      <section className="container-x py-16 lg:py-24" aria-labelledby="featured">
        <div className="flex items-end justify-between gap-4" data-reveal>
          <div>
            <p className="eyebrow text-accent">Most requested</p>
            <h2 id="featured" className="font-display mt-3 text-[clamp(2.2rem,7vw,4rem)]">
              Built to your spec
            </h2>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg hover:text-accent">
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 lg:grid-cols-4 lg:gap-x-5">
          {featured.map((p, i) => (
            <li key={p.id} data-reveal style={{ "--reveal-delay": `${(i % 4) * 60}ms` } as React.CSSProperties}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Design studio teaser ───────────────────────────────────────── */}
      <section className="container-x pb-16 lg:pb-24">
        <div className="on-dark relative grid overflow-hidden rounded-[22px] bg-ink text-white lg:grid-cols-2" data-reveal>
          <div className="relative z-10 p-7 sm:p-10 lg:p-14">
            <p className="eyebrow text-accent">Design Studio</p>
            <h2 className="font-display mt-3 text-[clamp(2.2rem,7vw,3.8rem)]">See your kit before you order it.</h2>
            <p className="mt-4 max-w-md text-white/65">
              Pick a pattern, your colours, sponsor, names and numbers — and turn it in 3D. When it looks right, send it to us as a quote
              request in one tap.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/design-studio" size="lg" data-track="customizer_start" data-track-label="Home teaser">
                Open the Design Studio <ArrowRight className="h-4 w-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <div className="relative min-h-[300px] lg:min-h-[460px]">
            <Image src="/media/work/royal-saints-trio.webp" alt="Three finished sublimated kits from the factory" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover opacity-85" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/20 to-transparent lg:via-ink/10" />
          </div>
        </div>
      </section>

      {/* ─── How ordering works ─────────────────────────────────────────── */}
      <section className="border-y hairline bg-chalk py-16 lg:py-24" aria-labelledby="process">
        <div className="container-x">
          <div className="max-w-2xl" data-reveal>
            <p className="eyebrow text-accent">How ordering works</p>
            <h2 id="process" className="font-display mt-3 text-[clamp(2.2rem,7vw,4rem)]">Four steps. No surprises.</h2>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.n} className="relative rounded-[var(--radius-card)] border hairline bg-paper p-6" data-reveal style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}>
                <p className="font-mono text-sm text-accent">{s.n}</p>
                <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">Lead times and prices are confirmed in writing with every quote.</p>
        </div>
      </section>

      {/* ─── Recent production ──────────────────────────────────────────── */}
      <section className="container-x py-16 lg:py-24" aria-labelledby="work">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end" data-reveal>
          <div>
            <p className="eyebrow text-accent">Recent production</p>
            <h2 id="work" className="font-display mt-3 text-[clamp(2.2rem,7vw,4rem)]">Off our factory floor.</h2>
          </div>
          <p className="max-w-sm text-sm text-muted">Real kits from recent runs, photographed before dispatch.</p>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
          {WORK.map((w, i) => (
            <li key={w.src} className={i === 0 ? "col-span-2 row-span-2 lg:col-span-2" : "lg:col-span-1"} data-reveal style={{ "--reveal-delay": `${i * 50}ms` } as React.CSSProperties}>
              <figure className="group relative h-full overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
                <div className={i === 0 ? "relative aspect-square h-full" : "relative aspect-[3/4]"}>
                  <Image src={w.src} alt={w.alt} fill sizes={i === 0 ? "(min-width:1024px) 33vw, 100vw" : "(min-width:1024px) 16vw, 50vw"} className="object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-[13px] font-medium text-white">
                  {w.caption}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Audiences ──────────────────────────────────────────────────── */}
      <section className="container-x pb-16 lg:pb-24" aria-labelledby="who">
        <div data-reveal>
          <p className="eyebrow text-accent">Who we make for</p>
          <h2 id="who" className="font-display mt-3 text-[clamp(2.2rem,7vw,4rem)]">Your team. Your brand. Your shelf.</h2>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a, i) => (
            <li key={a.title} data-reveal style={{ "--reveal-delay": `${i * 60}ms` } as React.CSSProperties}>
              <Link href={a.href} className="group flex h-full flex-col rounded-[var(--radius-card)] border hairline bg-surface p-6 transition-colors hover:border-accent">
                <h3 className="text-lg font-semibold">{a.title}</h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{a.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                  Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {facts.length > 0 && (
        <section className="border-y hairline bg-chalk">
          <dl className="container-x grid grid-cols-2 gap-6 py-10 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="eyebrow text-subtle">{f.label}</dt>
                <dd className="font-display mt-2 text-4xl">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ─── AI assistant band ──────────────────────────────────────────── */}
      <section className="container-x pb-16 lg:pb-24">
        <div className="on-dark grid gap-8 rounded-[22px] bg-ink-2 p-7 text-white sm:p-10 lg:grid-cols-[1fr_1.2fr] lg:p-14" data-reveal>
          <div>
            <p className="eyebrow inline-flex items-center gap-2 text-accent">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Product assistant
            </p>
            <h2 className="font-display mt-3 text-[clamp(2rem,6vw,3.4rem)]">Ask anything. Get a straight answer.</h2>
            <p className="mt-4 text-white/65">
              It answers from our real catalogue — materials, MOQs, sizes, customisation — and tells you plainly when something needs a
              person. Never a made-up number.
            </p>
          </div>
          <div className="self-center">
            <AskChips
              questions={[
                "Which football kit suits a school tournament?",
                "What's the MOQ for receiver gloves?",
                "Can you put my logo on a race suit?",
                "What leather do you use for jackets?",
                "Help me choose gloves for my team",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────────── */}
      {topFaqs.length > 0 && (
        <section className="container-x pb-16 lg:pb-24" aria-labelledby="faq">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.6fr]">
            <div data-reveal>
              <p className="eyebrow text-accent">Questions</p>
              <h2 id="faq" className="font-display mt-3 text-[clamp(2.2rem,7vw,4rem)]">Before you order</h2>
            </div>
            <div className="divide-y hairline border-y hairline" data-reveal>
              {topFaqs.map((f) => (
                <details key={f.id} className="group py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                    {f.question}
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border hairline text-lg transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="pb-5 pr-10 text-[15px] leading-relaxed text-muted">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA ──────────────────────────────────────────────────── */}
      <section className="on-accent relative overflow-hidden bg-accent text-accent-ink">
        <div className="container-x relative grid gap-8 py-16 lg:grid-cols-[1.4fr_1fr] lg:items-center lg:py-20">
          <div>
            <h2 className="font-display text-[clamp(2.4rem,8vw,4.6rem)]">Tell us what you need.</h2>
            <p className="mt-4 max-w-xl text-lg text-accent-ink/75">{settings.contact.responseTime || "We reply to every enquiry within one working day."}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
            <ButtonLink href="/quote" size="lg" variant="dark" data-track="cta_click" data-track-label="Footer CTA: Get a quote">
              Get a quote <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            {wa ? (
              <ButtonLink href={wa} size="lg" variant="whatsapp" data-track="whatsapp_click" data-track-label="Footer CTA WhatsApp">
                Chat on WhatsApp
              </ButtonLink>
            ) : (
              <ButtonLink href="/contact" size="lg" variant="outline" className="border-accent-ink/35 text-accent-ink hover:border-accent-ink hover:bg-accent-ink/5" data-track="cta_click" data-track-label="Footer CTA: Contact">
                Contact us
              </ButtonLink>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
