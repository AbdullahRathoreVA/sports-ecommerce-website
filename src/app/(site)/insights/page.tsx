import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPosts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Buyer Guides",
  description: "Practical guides for buying custom sportswear and leather goods: sublimation vs screen printing, CE ratings on motorbike leathers, and how to brief a factory.",
  alternates: { canonical: "/insights" },
};

export default async function InsightsPage() {
  const posts = await getPosts();
  return (
    <div className="container-x pb-28 pt-10 lg:pb-24 lg:pt-14">
      <p className="eyebrow text-accent">Buyer guides</p>
      <h1 className="font-display mt-3 text-[clamp(2.6rem,9vw,4.6rem)]">Know what you&apos;re ordering.</h1>
      <p className="mt-3 max-w-2xl text-muted">Straight answers to the questions buyers ask us most.</p>
      <ul className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/insights/${p.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
                {p.coverImage && <Image src={p.coverImage} alt={p.coverAlt ?? ""} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />}
              </div>
              <p className="mt-4 font-mono text-xs uppercase tracking-wider text-subtle">{p.topic}</p>
              <h2 className="mt-1.5 text-xl font-semibold leading-snug group-hover:text-accent">{p.title}</h2>
              <p className="mt-2 text-[15px] text-muted">{p.excerpt}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
