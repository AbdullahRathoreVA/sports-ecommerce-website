"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const SOCCER = "/products/c/sublimation-teamwear";
const GLOVES = "/products/c/goalkeeper-gloves";
const BALLS = "/products/c/footballs";
const MOTO = "/products/c/motorbike-racing-suits";
const RACING = "/products/c/car-kart-racing-suits";
const LEATHER = "/products/c/leather-jackets";
const SPORT = "/products/c/sportswear";

/** Cut-outs in public/media/ring-v1 (made by .gstack/prep-ring.py); the far side of the ring shows each product's back. */
const ITEMS = [
  { key: "jersey-red-10", label: "Soccer uniform", href: SOCCER },
  { key: "ball-red", label: "Match football", href: BALLS },
  { key: "gk-a", label: "Goalkeeper gloves", href: GLOVES },
  { key: "moto-white-red", label: "Motorbike suit", href: MOTO },
  { key: "leather-black-red", label: "Leather jacket", href: LEATHER },
  { key: "racing-a", label: "Racing suit", href: RACING },
  { key: "tracksuit-a", label: "Tracksuit", href: SPORT },
  { key: "jersey-red", label: "Soccer uniform", href: SOCCER },
  { key: "gk-b", label: "Goalkeeper gloves", href: GLOVES },
  { key: "ball-black", label: "Match football", href: BALLS },
  { key: "moto-b", label: "Motorbike suit", href: MOTO },
  { key: "racing-b", label: "Racing suit", href: RACING },
  { key: "tracksuit-b", label: "Tracksuit", href: SPORT },
];
const N = ITEMS.length;

/**
 * "The range, in the round": every product stands on a 3D ring that turns as you scroll
 * (Apple-style scrubbing). Where the browser supports scroll-driven animations the turn runs
 * on the compositor (globals.css, "Range ring"); elsewhere a light scroll handler drives it.
 * Pure CSS 3D with real photos — no WebGL, nothing to load or compile.
 */
export function RangeRing() {
  const track = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const native = typeof CSS !== "undefined" && CSS.supports("animation-timeline: view()");
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const run = rect.height - window.innerHeight;
      const p = run > 0 ? Math.min(1, Math.max(0, -rect.top / run)) : 0;
      if (!native) {
        if (ring.current) ring.current.style.transform = `translateZ(calc(var(--r) * -1)) rotateX(-8deg) rotateY(${(-360 * p).toFixed(2)}deg)`;
        if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
      setActive(Math.round(p * N) % N);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const current = ITEMS[active]!;

  return (
    <section className="on-dark ring-track relative bg-ink" aria-labelledby="range-ring">
      <div ref={track} className="ring-runway">
        <div className="ring-stage">
          <div className="pointer-events-none absolute left-1/2 top-[56%] h-[46vmin] w-[120vmin] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(225,29,38,0.32),rgba(225,29,38,0.08)_55%,transparent)] blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute left-1/2 top-[calc(56%+var(--ch)*0.5)] h-[9vmin] w-[90vmin] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.10),transparent)]" aria-hidden />

          <div className="container-x relative z-10 pt-[calc(var(--header-h)+1.5rem)] lg:pt-[calc(var(--header-h)+2.5rem)]">
            <p className="label text-white/45">The range</p>
            <h2 id="range-ring" className="font-display mt-3 max-w-xl text-[clamp(1.9rem,6.6vw,3.6rem)] leading-[0.95] text-white">
              Every line.
              <span className="block text-white/40">Turned in 3D.</span>
            </h2>
          </div>

          <div className="ring-pivot">
            <div ref={ring} className="ring-spin">
              {ITEMS.map((it, i) => (
                <div key={it.key} className="ring-card" style={{ transform: `rotateY(${((i * 360) / N).toFixed(3)}deg) translateZ(var(--r))` }}>
                  <Link href={it.href} className="ring-face group" data-track="category_view" data-category={it.href.split("/").pop()} tabIndex={-1}>
                    <Image src={`/media/ring-v1/${it.key}-front.webp`} alt={it.label} fill sizes="(min-width:1024px) 260px, 50vw" className="object-contain" />
                  </Link>
                  <div className="ring-face ring-back" aria-hidden>
                    <Image src={`/media/ring-v1/${it.key}-back.webp`} alt="" fill sizes="(min-width:1024px) 180px, 34vw" className="object-contain" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="container-x absolute inset-x-0 bottom-0 z-10 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:pb-10">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="label text-[0.62rem] text-white/45">
                  {String(active + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
                </p>
                <p className="mt-2 truncate text-[clamp(1.35rem,4.6vw,2.2rem)] font-semibold tracking-tight text-white" aria-live="polite">
                  {current.label}
                </p>
              </div>
              <Link href={current.href} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] bg-white px-5 text-sm font-semibold text-ink hover:bg-accent hover:text-white" data-track="cta_click" data-track-label="Range ring: explore">
                Explore <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-5 h-px w-full bg-white/15">
              <div ref={bar} className="ring-bar h-px origin-left bg-accent" />
            </div>
            <p className="mt-3 hidden text-xs text-white/40 [@media(prefers-reduced-motion:no-preference)]:block">Scroll to turn the range</p>
          </div>
        </div>
      </div>
    </section>
  );
}
