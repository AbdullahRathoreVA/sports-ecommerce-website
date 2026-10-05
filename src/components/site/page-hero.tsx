import Image from "next/image";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  imageAlt = "",
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  image?: string;
  imageAlt?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("on-dark relative overflow-hidden bg-ink text-white", className)}>
      {image && <Image src={image} alt={imageAlt} fill priority sizes="100vw" className="object-cover opacity-40" />}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/25" />
      <div className="container-x relative py-14 lg:py-24">
        <p className="eyebrow text-accent">{eyebrow}</p>
        <h1 className="font-display mt-3 max-w-4xl text-balance text-[clamp(2.7rem,9vw,5.6rem)]">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-pretty text-lg text-white/75">{intro}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}

export function CaptionedImage({ src, alt, caption, className, sizes = "(min-width:1024px) 33vw, 100vw", ratio = "aspect-[4/3]" }: { src: string; alt: string; caption: string; className?: string; sizes?: string; ratio?: string }) {
  return (
    <figure className={cn("group", className)}>
      <div className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-surface-2", ratio)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      </div>
      <figcaption className="mt-2.5 text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
