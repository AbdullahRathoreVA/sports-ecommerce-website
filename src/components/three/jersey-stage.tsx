"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PRESETS, renderJersey, syncCanvasFont, type JerseyDesign } from "@/lib/jersey/design";
import { cn } from "@/lib/utils";

const JerseyScene = dynamic(() => import("./jersey-scene"), { ssr: false });

/**
 * Decides whether 3D is worth it on this device, and lazy-loads it only once
 * the stage is near the viewport and the browser is idle.
 *
 *   - no WebGL / Save-Data / ≤2 GB device memory → stays on the poster image
 *   - reduced motion → 3D renders, but no auto-rotate and no sweep animation
 *   - off-screen or hidden tab → render loop paused
 */
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

export function HeroJersey({ poster, posterAlt, className }: { poster: string; posterAlt: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"poster" | "3d">("poster");
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [canvases, setCanvases] = useState<{ a: HTMLCanvasElement; b: HTMLCanvasElement } | null>(null);
  const [revision, setRevision] = useState(0);
  const [label, setLabel] = useState(PRESETS[0]!.label);
  const sweep = useRef(0);
  const rotation = useRef(-0.35);
  const reduced = useRef(false);
  const [still, setStill] = useState(false);
  const drag = useRef<{ x: number; start: number } | null>(null);

  useEffect(() => {
    // `?still` freezes rotation and the sweep — used to capture the poster frame.
    const still = new URLSearchParams(location.search).has("still");
    reduced.current = still || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) setStill(true);
    if (still) rotation.current = Number(new URLSearchParams(location.search).get("still")) || 0;
    if (capability() !== "3d") return;
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry!.isIntersecting), { rootMargin: "200px" });
    io.observe(el);
    const start = () => {
      document.fonts?.ready.then(() => {
        syncCanvasFont();
        const a = renderJersey(PRESETS[0]!.design as JerseyDesign);
        const b = renderJersey(PRESETS[1]!.design as JerseyDesign);
        setCanvases({ a, b });
        setMode("3d");
      });
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(start, { timeout: 1500 });
    else setTimeout(start, 600);
    return () => io.disconnect();
  }, []);

  // Heat-press cycle: hold, sweep the next design down the shirt, repeat.
  useEffect(() => {
    if (mode !== "3d" || !canvases || reduced.current || !visible) return;
    let index = 1;
    let raf = 0;
    let phaseStart = performance.now();
    let phase: "hold" | "sweep" = "hold";
    const HOLD = 3400;
    const SWEEP = 1700;
    const tick = (now: number) => {
      const t = now - phaseStart;
      if (phase === "hold" && t > HOLD) {
        phase = "sweep";
        phaseStart = now;
      } else if (phase === "sweep") {
        sweep.current = Math.min(1.08, (t / SWEEP) * 1.08);
        if (t > SWEEP) {
          // Commit B as the new base, render the next preset into B.
          const next = (index + 1) % PRESETS.length;
          renderJersey(PRESETS[index]!.design as JerseyDesign, canvases.a);
          renderJersey(PRESETS[next]!.design as JerseyDesign, canvases.b);
          setLabel(PRESETS[index]!.label);
          index = next;
          sweep.current = 0;
          setRevision((r) => r + 1);
          phase = "hold";
          phaseStart = now;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, canvases, visible]);

  return (
    <div
      ref={wrap}
      className={cn("relative select-none", className)}
      style={{ touchAction: "pan-y" }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, start: rotation.current };
      }}
      onPointerMove={(e) => {
        if (!drag.current || e.buttons === 0) return;
        rotation.current = drag.current.start + (e.clientX - drag.current.x) * 0.012;
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <Image
        src={poster}
        alt={posterAlt}
        fill
        sizes="(min-width: 1024px) 40vw, 90vw"
        className={cn(
          "object-contain transition-opacity duration-700",
          mode === "3d" && ready ? "opacity-0" : "opacity-100",
        )}
      />
      {mode === "3d" && canvases && (
        <div className={cn("absolute inset-0 transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}>
          <JerseyScene
            textureA={canvases.a}
            textureB={canvases.b}
            sweepRef={sweep}
            rotationRef={rotation}
            autoRotate={!reduced.current}
            active={visible}
            revision={revision}
            still={still}
            className="!h-full !w-full"
          />
          <ReadyProbe onReady={() => setReady(true)} />
        </div>
      )}
      {mode === "3d" && ready && (
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/70 backdrop-blur">
          Sublimated live · {label} · drag to rotate
        </p>
      )}
    </div>
  );
}

/** Flags readiness one frame after mount, so the poster cross-fades only once WebGL has drawn. */
function ReadyProbe({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const id = setTimeout(onReady, 450);
    return () => clearTimeout(id);
  }, [onReady]);
  return null;
}
