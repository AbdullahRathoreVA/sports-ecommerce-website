import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { Markdown } from "@/components/ui/markdown";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd, articleSchema, breadcrumbSchema } from "@/components/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDesc ?? post.excerpt,
    alternates: { canonical: `/insights/${post.slug}` },
    openGraph: { type: "article", images: post.coverImage ? [{ url: post.coverImage, alt: post.coverAlt ?? post.title }] : undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const [post, settings] = await Promise.all([getPost(slug), getSettings()]);
  if (!post) notFound();
  return (
    <article className="pb-28 lg:pb-24">
      <JsonLd
        data={[
          articleSchema(post, settings.brand.name),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Buyer guides", path: "/insights" },
            { name: post.title, path: `/insights/${post.slug}` },
          ]),
        ]}
      />
      <header className="container-x max-w-3xl pt-10 lg:pt-14">
        <p className="eyebrow text-accent">{post.topic}</p>
        <h1 className="mt-3 text-balance text-[clamp(2rem,6vw,3.2rem)] font-semibold leading-[1.08] tracking-tight">{post.title}</h1>
        <p className="mt-4 text-lg text-muted">{post.excerpt}</p>
        {post.publishedAt && (
          <p className="mt-4 text-sm text-subtle">
            {new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </header>
      {post.coverImage && (
        <div className="container-x mt-8 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
            <Image src={post.coverImage} alt={post.coverAlt ?? ""} fill priority sizes="(min-width:1024px) 1000px, 100vw" className="object-cover" />
          </div>
        </div>
      )}
      <div className="container-x max-w-3xl">
        <Markdown source={post.body} className="mt-6" />
        <div className="on-dark mt-12 rounded-[var(--radius-card)] bg-ink p-6 text-white sm:p-8">
          <p className="text-xl font-semibold">Have a project in mind?</p>
          <p className="mt-2 text-white/70">Tell us what you need and we&apos;ll come back with options and pricing.</p>
          <ButtonLink href="/quote" className="mt-5" data-track="cta_click" data-track-label={`Guide: ${post.slug}`}>
            Request a quote
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
