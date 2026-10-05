"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * One IntersectionObserver for every `[data-reveal]` element. Only elements
 * that start below the viewport are armed (hidden until scrolled to), so
 * content is never invisible without JS and above-the-fold content never
 * flickers. Reduced motion skips the effect entirely.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const vh = window.innerHeight;
    // Arm newly rendered elements that start below the fold…
    document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-armed]):not(.is-in)").forEach((el) => {
      if (el.getBoundingClientRect().top > vh * 0.92) el.setAttribute("data-armed", "");
    });
    // …then observe every armed element still waiting — including ones armed by
    // a previous mount (React strict mode re-runs effects; a cleanup must never
    // strand elements in their hidden state).
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal][data-armed]:not(.is-in)"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          // Also reveal anything already scrolled past (fast flings, anchor jumps).
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));

    // An observer gets no callback when a fast fling or anchor jump carries an
    // element from below the viewport to above it in one frame — so also
    // reveal anything whose top has passed the bottom of the viewport.
    let raf = 0;
    const sweep = () => {
      raf = 0;
      const limit = window.innerHeight;
      for (const el of els) {
        if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < limit) {
          el.classList.add("is-in");
          io.unobserve(el);
        }
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);
  return null;
}
