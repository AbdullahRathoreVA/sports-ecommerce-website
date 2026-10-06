import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, GraduationCap, Store, Tag, Trophy } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { getAllProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Industries We Serve — Schools, Clubs, Companies, Brands & Retailers",
  description:
    "Custom sportswear and uniforms for schools and colleges, sports clubs, companies, private-label brands and retailers — made in our own factory in Sialkot.",
  alternates: { canonical: "/industries" },
};

const SEGMENTS = [
  {
    id: "schools",
    icon: GraduationCap,
    title: "Schools & colleges",
    body: "Complete sports uniforms for schools, colleges and academies — PE kits, house colours, tracksuits and team kits that last a full season.",
    points: ["Bulk pricing for school budgets", "Durable fabrics for daily wear", "Full uniform programmes with school branding", "Repeat orders matched to the first run"],
    uses: ["schools"],
    generic: ["PE kits & uniforms", "Team kits", "Tracksuits", "Hoodies", "Polos"],
  },
  {
    id: "clubs",
    icon: Trophy,
    title: "Sports clubs & teams",
    body: "Match kits, goalkeeper kits, training wear and fan merchandise for football, cricket, rugby, baseball and American-football teams.",
    points: ["Names and numbers for every player", "Full club branding and sponsor placements", "Youth and adult sizes in one order", "Home, away and keeper kits as a matching set"],
    uses: ["clubs", "leagues", "academies"],
    generic: ["Soccer kits", "American football uniforms", "Cricket & baseball kits", "Training wear", "Tracksuits"],
  },
  {
    id: "companies",
    icon: Building2,
    title: "Companies & events",
    body: "Branded polos, T-shirts, hoodies and team uniforms for staff, corporate teams and events — in your company colours.",
    points: ["Logo embroidery or printing", "Consistent colours across every reorder", "Sizes packed per person or per department", "Fast sampling for event deadlines"],
    uses: ["companies", "events"],
    generic: ["Polos", "T-shirts", "Hoodies", "Company uniforms", "Event kits"],
  },
  {
    id: "brands",
    icon: Tag,
    title: "Brands & private label",
    body: "Your designs, your labels, your packaging. We manufacture quietly behind your brand, from the first sample to repeat runs.",
    points: ["Work from your tech pack or a reference sample", "Custom labels, neck tape, tags and polybags", "Repeatable quality across reorders", "Samples before every bulk run"],
    uses: ["brands"],
    generic: ["Gym wear", "Tracksuits", "Hoodies", "Jerseys", "Custom packaging"],
  },
  {
    id: "retail",
    icon: Store,
    title: "Retailers & distributors",
    body: "Sportswear for your shelves and your customers — consistent sizing and finish, priced by quantity, packed by size run.",
    points: ["Quantity-tier pricing", "Size-run packing for stores", "Samples to test before you commit", "Stock styles or your own designs"],
    uses: ["retailers"],
    generic: ["Team kits", "Tracksuits", "Gym wear", "T-shirts", "Hoodies"],
  },
];

export default async function IndustriesPage() {
  const products = await getAllProducts();
  return (
    <>
      <PageHero
        eyebrow="Who we serve / Alrobel Sportswear"
        title="Industries we partner with"
        intro="Different customers need different things. Here's how we work with schools, clubs, companies, brands and retailers."
        meta={[
          { label: "Sectors", value: "Multi-industry" },
          { label: "Coverage", value: "Worldwide shipping" },
          { label: "Custom", value: "OEM / private label" },
          { label: "Partner", value: "Direct from the factory" },
        ]}
      >
        <nav aria-label="Jump to sector" className="flex flex-wrap gap-2">
          {SEGMENTS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={
                i === 0
                  ? "inline-flex h-10 items-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-accent-ink"
                  : "inline-flex h-10 items-center rounded-[var(--radius-control)] border border-white/25 px-4 text-sm font-semibold text-white hover:border-white/60"
              }
            >
              {s.title}
            </a>
          ))}
        </nav>
      </PageHero>

      <div className="container-x divide-y hairline py-6 lg:py-10">
        {SEGMENTS.map((s) => {
          const picks = products.filter((p) => p.useCases.some((u) => s.uses.includes(u))).slice(0, 5);
          return (
            <section key={s.id} id={s.id} className="grid scroll-mt-24 gap-10 py-14 lg:grid-cols-2 lg:gap-16 lg:py-16" aria-labelledby={`${s.id}-h`}>
              <div data-reveal>
                <span className="grid h-12 w-12 place-items-center rounded-md bg-accent/10 text-accent">
                  <s.icon className="h-6 w-6" aria-hidden />
                </span>
                <h2 id={`${s.id}-h`} className="mt-6 text-[clamp(1.8rem,4vw,2.4rem)] font-semibold tracking-tight">
                  {s.title}
                </h2>
                <p className="mt-3 max-w-lg text-[16px] leading-relaxed text-muted">{s.body}</p>
                <ul className="mt-6 space-y-3">
                  {s.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-3 text-[15px]">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden /> {pt}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/quote?product=${encodeURIComponent(s.title)}`}
                  className="mt-8 inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-3"
                  data-track="cta_click"
                  data-track-label={`Industries: ${s.title}`}
                >
                  Get industry pricing <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="self-start rounded-[var(--radius-card)] border hairline bg-chalk p-6 sm:p-8" data-reveal>
                <p className="text-[17px] font-semibold">Popular for {s.title.toLowerCase()}</p>
                <ol className="mt-5 border-t hairline">
                  {(picks.length > 0 ? picks.map((p) => ({ label: p.name, href: `/products/${p.slug}` })) : s.generic.map((g) => ({ label: g, href: "/products" }))).map((item, i) => (
                    <li key={item.label} className="border-b hairline">
                      <Link href={item.href} className="group flex items-center gap-4 py-3.5 text-[15px]">
                        <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</span>
                        <span className="flex-1 group-hover:text-accent">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <Link href="/products" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                  View all products <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
