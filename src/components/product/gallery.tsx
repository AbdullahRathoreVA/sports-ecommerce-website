"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Img = { url: string; alt: string; width: number | null; height: number | null; source: string };

/**
 * Mobile: full-bleed swipe carousel (scroll-snap, no JS physics) with a
 * counter. Desktop: thumbnail rail + large image.
 */
export function ProductGallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const rail = useRef<HTMLDivElement>(null);
  if (images.length === 0) {
    return <div className="grid aspect-[4/5] place-items-center rounded-[var(--radius-card)] bg-surface-2 text-subtle">Photography coming soon</div>;
  }

  return (
    <div>
      {/* Mobile carousel */}
      <div className="relative -mx-4 sm:-mx-6 lg:hidden">
        <div
          ref={rail}
          className="scrollbar-none snap-x-mandatory flex overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
          aria-label={`${name} images`}
        >
          {images.map((img, i) => (
            <div key={img.url} className="snap-start-always relative aspect-[4/5] w-full shrink-0 bg-surface-2">
              <Image src={img.url} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2.5 py-1.5 backdrop-blur">
            {images.map((img, i) => (
              <span key={img.url} className={cn("h-1.5 rounded-full bg-surface transition-all", i === active ? "w-5" : "w-1.5 opacity-60")} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-[76px_1fr]">
        <ul className="flex flex-col gap-3" aria-label="Choose image">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}: ${img.alt}`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden rounded-lg bg-surface-2 ring-2 transition",
                  i === active ? "ring-accent" : "ring-transparent hover:ring-white/25",
                )}
              >
                <Image src={img.url} alt="" fill sizes="76px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
          <Image key={images[active]!.url} src={images[active]!.url} alt={images[active]!.alt} fill priority sizes="(min-width:1280px) 640px, 50vw" className="object-cover animate-fade" />
        </div>
      </div>
      {images.some((i) => i.source === "placeholder") && (
        <p className="mt-3 text-xs text-subtle">Studio render shown — factory photography of this line is on its way.</p>
      )}
    </div>
  );
}
