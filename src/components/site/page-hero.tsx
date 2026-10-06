import Image from "next/image";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  imageAlt = "",
  meta,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  image?: string;
  imageAlt?: string;
  /** 2×2 info grid on the right, e.g. [{ label: "Low MOQ", value: "Flexible orders" }]. */
  meta?: { label: string; value: string }[];
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "on-dark relative -mt-[calc(var(--header-h)+12px)] overflow-hidden bg-ink pt-[calc(var(--header-h)+12px)] text-white",
        className,
      )}
    >
      {image && <Image src={image} alt={imageAlt} fill priority sizes="100vw" className="object-cover opacity-25" />}
      {image && <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />}
      <div className="container-x relative grid gap-10 py-14 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:py-20">
        <div>
          <p className="label text-accent">{eyebrow}</p>
          <h1 className="font-display mt-5 max-w-4xl text-balance text-[clamp(2.6rem,8vw,4.8rem)]">{title}</h1>
          {intro && <p className="mt-5 max-w-xl text-pretty text-[16px] leading-relaxed text-white/65">{intro}</p>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {meta && meta.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/15 pt-6">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="label text-[0.6rem] text-white/45">{m.label}</dt>
                <dd className="mt-1.5 text-[15px] font-semibold">{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
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
