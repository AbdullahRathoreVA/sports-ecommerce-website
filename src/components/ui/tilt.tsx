"use client";

import { useEffect } from "react";

/**
 * Mouse devices: any `.tilt-hover` element leans toward the pointer in 3D with a soft glare
 * (globals.css, "tilt-hover"). One delegated listener for the whole site; writes two CSS
 * variables per frame at most, so it never re-renders React.
 */
export function TiltPointer() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last: { el: HTMLElement; x: number; y: number } | null = null;
    const apply = () => {
      raf = 0;
      if (!last) return;
      const { el, x, y } = last;
      const r = el.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (x - r.left) / r.width));
      const py = Math.min(1, Math.max(0, (y - r.top) / r.height));
      el.style.setProperty("--ry", `${((px - 0.5) * 9).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - py) * 7).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(".tilt-hover");
      if (last && last.el !== el) {
        for (const v of ["--rx", "--ry", "--gx", "--gy"]) last.el.style.removeProperty(v);
      }
      last = el ? { el, x: e.clientX, y: e.clientY } : null;
      if (el && !raf) raf = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
