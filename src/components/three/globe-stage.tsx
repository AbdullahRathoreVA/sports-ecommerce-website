"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Destination } from "./globe-scene";
import { cn } from "@/lib/utils";
import { deviceTier } from "@/lib/device";

const GlobeScene = dynamic(() => import("./globe-scene"), { ssr: false });

/** Lazy 3D shipping globe; a simple wireframe SVG stands in until (or instead of) WebGL. */
export function ShippingGlobe({ origin, destinations, className }: { origin: Destination; destinations: Destination[]; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"svg" | "3d">("svg");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (deviceTier() !== "3d") return;
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e!.isIntersecting);
        if (e!.isIntersecting) setMode("3d");
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={cn("relative aspect-square", className)}>
      {mode === "3d" ? (
        <GlobeScene origin={origin} destinations={destinations} active={visible} className="h-full w-full cursor-grab active:cursor-grabbing" />
      ) : (
        <svg viewBox="0 0 400 400" className="h-full w-full text-white/15" aria-hidden>
          <circle cx="200" cy="200" r="180" fill="none" stroke="currentColor" />
          {[40, 80, 120, 160].map((r) => (
            <ellipse key={r} cx="200" cy="200" rx={r} ry="180" fill="none" stroke="currentColor" />
          ))}
          {[-120, -60, 0, 60, 120].map((y) => (
            <ellipse key={y} cx="200" cy={200 + y} rx={Math.sqrt(180 * 180 - y * y)} ry={18} fill="none" stroke="currentColor" />
          ))}
        </svg>
      )}
    </div>
  );
}
