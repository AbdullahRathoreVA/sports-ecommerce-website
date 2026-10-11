"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { deviceTier } from "@/lib/device";
import { SHOWCASE } from "./showcase-scene";

const ShowcaseScene = dynamic(() => import("./showcase-scene"), { ssr: false });

/**
 * Hero showroom stage. The poster (a frame of the same scene) shows instantly;
 * the 3D loads when the browser is idle, compiles in the background and only
 * then cross-fades in. Drag or swipe sideways to spin the range; the product
 * at the front is named below with a link to its range.
 */
export function HeroShowcase({ poster, stagePoster, posterAlt, className }: { poster: string; stagePoster: string; posterAlt: string; className?: string }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const dragRef = useRef(0);
  const hoverRef = useRef(false);
  const drag = useRef<{ x: number; moved: number } | null>(null);
  const [load, setLoad] = useState(false);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(false);
  const [still, setStill] = useState(false);
  const [lite, setLite] = useState(false);
  const [front, setFront] = useState(0);
  const [bare, setBare] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("still")) setStill(true);
    if (params.has("bare")) setBare(true);
    if (params.has("still") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) setSettled(true);
    if (deviceTier() !== "3d") {
      setLite(true);
      return;
    }
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry!.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => setLoad(true), { timeout: 1200 });
    else setTimeout(() => setLoad(true), 400);
    return () => io.disconnect();
  }, []);

  const item = SHOWCASE[front] ?? SHOWCASE[0]!;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={wrap}
        className="absolute inset-0 select-none"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, moved: 0 };
        }}
        onPointerMove={(e) => {
          if (!drag.current || e.buttons === 0) return;
          const dx = e.clientX - drag.current.x;
          drag.current.x = e.clientX;
          drag.current.moved += Math.abs(dx);
          dragRef.current += dx * 0.0065;
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onClickCapture={(e) => {
          // A drag is not a click on a product.
          if (drag.current && drag.current.moved > 6) e.stopPropagation();
        }}
      >
        <div className={cn("absolute inset-0", lite && !settled && "hero-lite")}>
          {/* 3D devices: the stage (logo + ring) so the products fly in seamlessly; others: the full range. */}
          <Image src={lite ? poster : stagePoster} alt={posterAlt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className={cn("object-contain transition-opacity duration-500", ready ? "opacity-0" : "opacity-100")} />
        </div>
        {load && (
          <div className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
            <ShowcaseScene
              active={visible || still}
              settled={settled}
              still={still}
              bare={bare}
              dragRef={dragRef}
              hoverRef={hoverRef}
              onReady={() => setReady(true)}
              onFront={setFront}
              onItemClick={(href) => router.push(href)}
              className="h-full w-full cursor-grab active:cursor-grabbing"
            />
          </div>
        )}
      </div>
      {ready && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-2 sm:bottom-5">
          <Link
            href={item.href}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/12 bg-ink/80 py-2 pl-4 pr-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:border-accent"
            data-track="nav_click"
            data-track-label={`Showroom: ${item.label}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            {item.label}
            <ArrowRight className="h-4 w-4 text-accent" aria-hidden />
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-xs text-white/50 sm:inline-flex">
            <Hand className="h-3.5 w-3.5" aria-hidden /> Drag to spin
          </span>
        </div>
      )}
    </div>
  );
}
