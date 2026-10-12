"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Destination } from "./globe-scene";
import { cn } from "@/lib/utils";
import { afterSettled, deviceQuality, deviceTier } from "@/lib/device";

const GlobeScene = dynamic(() => import("./globe-scene"), { ssr: false });

/** Lazy 3D shipping globe; a simple wireframe SVG stands in until (or instead of) WebGL. */
export function ShippingGlobe({ origin, destinations, className }: { origin: Destination; destinations: Destination[]; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"svg" | "3d">("svg");
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (deviceTier() !== "3d") return;
    const el = wrap.current;
    if (!el) return;
    let started = false;
    const begin = () => {
      if (started) return;
      started = true;
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(() => setMode("3d"), { timeout: 1200 });
      else setTimeout(() => setMode("3d"), 200);
    };
    // Prepare the globe well before it scrolls in, while the browser is idle, so a fast flick never stalls on it.
    const prepare = new IntersectionObserver(([e]) => e!.isIntersecting && begin(), { rootMargin: "1400px 0px" });
    const cancel = deviceQuality() === "high" ? afterSettled(begin, 5000) : () => undefined;
    // Animate only while it is actually near the screen.
    const io = new IntersectionObserver(([e]) => setVisible(e!.isIntersecting), { rootMargin: "200px 0px" });
    prepare.observe(el);
    io.observe(el);
    return () => {
      cancel();
      prepare.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className={cn("relative aspect-square", className)}>
      {mode === "3d" && (
        <div className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <GlobeScene origin={origin} destinations={destinations} active={visible} onReady={() => setReady(true)} className="h-full w-full cursor-grab active:cursor-grabbing" />
        </div>
      )}
      {!ready && (
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full text-white/15" aria-hidden>
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
