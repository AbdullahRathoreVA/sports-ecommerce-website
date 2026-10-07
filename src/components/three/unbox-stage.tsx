"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PRESETS, renderJersey, syncCanvasFont, type JerseyDesign } from "@/lib/jersey/design";
import { renderBoxArt } from "@/lib/jersey/box-art";
import { cn } from "@/lib/utils";

const UnboxScene = dynamic(() => import("./unbox-scene"), { ssr: false });
type BoxArt = ReturnType<typeof renderBoxArt>;

/** Three kits for the opening: Alrobel black/red, an American-football jersey and a white/red team kit. */
const KITS: JerseyDesign[] = [
  PRESETS[0]!.design as JerseyDesign,
  { base: "#1d3fc4", accent: "#ffffff", trim: "#ffffff", pattern: "solid", sponsor: "ALROBEL", name: "ALROBEL", number: "23", textColor: "#ffffff", houseMark: true } as JerseyDesign,
  { base: "#f2f2f0", accent: "#e11d26", trim: "#111214", pattern: "chevron", sponsor: "YOUR BRAND", name: "SIALKOT", number: "10", textColor: "#111214", houseMark: true } as JerseyDesign,
];

function capability(): "3d" | "poster" {
  if (typeof window === "undefined") return "poster";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "poster";
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory <= 2) return "poster";
  try {
    const c = document.createElement("canvas");
    if (!(c.getContext("webgl2") || c.getContext("webgl"))) return "poster";
  } catch {
    return "poster";
  }
  return "3d";
}

/**
 * Hero stage: the poster shows instantly; on capable devices the 3D unboxing
 * loads when idle and plays once in view. Reduced motion → final pose, no intro.
 */
export function HeroUnbox({ poster, posterAlt, className }: { poster: string; posterAlt: string; className?: string }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [art, setArt] = useState<{ kits: HTMLCanvasElement[]; box: BoxArt } | null>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("still")) setStill(true);
    if (params.has("still") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) setSettled(true);
    if (capability() !== "3d") return;
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry!.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const start = () =>
      document.fonts?.ready.then(() => {
        syncCanvasFont();
        setArt({ kits: KITS.map((k) => renderJersey(k)), box: renderBoxArt() });
      });
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(start, { timeout: 900 });
    else setTimeout(start, 300);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!art) return;
    const t = setTimeout(() => setReady(true), 120);
    return () => clearTimeout(t);
  }, [art]);

  return (
    <div ref={wrap} className={cn("relative", className)}>
      <Image src={poster} alt={posterAlt} fill priority sizes="(min-width:1024px) 50vw, 100vw" className={cn("object-contain transition-opacity duration-700", ready ? "opacity-0" : "opacity-100")} />
      {art && (
        <div className={cn("absolute inset-0 transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}>
          <UnboxScene
            kits={art.kits}
            boxArt={art.box}
            active={visible || still}
            settled={settled}
            still={still}
            onKitClick={() => router.push("/design-studio")}
            className="h-full w-full"
          />
        </div>
      )}
    </div>
  );
}
