"use client";

import { useEffect, useRef, useState } from "react";
import { FACTORY_VIDEO_ENABLED } from "./config";
import { Pause, Play } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export type Clip = { id: string; step: string; title: string; caption: string };

/**
 * Story-style reel of the factory's own footage. Each clip plays muted and
 * looped only while it is on screen (battery and data friendly), never under
 * reduced motion, and can be paused by the user.
 */
export function ClipReel({ clips }: { clips: Clip[] }) {
  if (!FACTORY_VIDEO_ENABLED) return null;
  return (
    <ol className="scrollbar-none snap-x-mandatory -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:gap-3 lg:overflow-visible lg:px-0">
      {clips.map((clip, i) => (
        <li key={clip.id} className="snap-start-always w-[64vw] max-w-[260px] shrink-0 sm:w-[38vw] lg:w-auto lg:max-w-none">
          <ClipCard clip={clip} index={i} />
        </li>
      ))}
    </ol>
  );
}

function ClipCard({ clip, index }: { clip: Clip; index: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(isReduced);
    const v = video.current;
    if (!v) return;
    if (isReduced) {
      setPaused(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!v) return;
        if (entry!.isIntersecting && !userPaused.current) {
          if (v.preload !== "auto") v.preload = "auto";
          v.play().then(() => setPaused(false)).catch(() => setPaused(true));
        } else {
          v.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().then(() => setPaused(false)).catch(() => undefined);
      track("video_play", { label: `Clip: ${clip.title}` });
    } else {
      userPaused.current = true;
      v.pause();
      setPaused(true);
    }
  };

  return (
    <figure className="group relative aspect-[9/16] overflow-hidden rounded-[var(--radius-card)] bg-ink-3">
      <video
        ref={video}
        className="absolute inset-0 h-full w-full object-cover"
        src={`/media/clips/${clip.id}.mp4`}
        poster={`/media/clips/${clip.id}.webp`}
        muted
        loop
        playsInline
        preload="none"
        aria-label={`${clip.title}: ${clip.caption}`}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
      <span className="pointer-events-none absolute left-3 top-3 font-mono text-[11px] tracking-wider text-white/80">
        {String(index + 1).padStart(2, "0")} — {clip.step}
      </span>
      <figcaption className="pointer-events-none absolute inset-x-3 bottom-3 text-white">
        <p className="font-display text-[1.35rem] leading-[0.95]">{clip.title}</p>
        <p className="mt-1.5 text-[13px] leading-snug text-white/75">{clip.caption}</p>
      </figcaption>
      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? `Play ${clip.title}` : `Pause ${clip.title}`}
        className={cn(
          "absolute right-2.5 top-2.5 grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition-opacity",
          paused || reduced ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        {paused ? <Play className="h-4 w-4 translate-x-px" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
      </button>
    </figure>
  );
}

export const FACTORY_CLIPS: Clip[] = [
  { id: "print", step: "Print", title: "Printed in-house", caption: "Your artwork runs on our own large-format sublimation printers." },
  { id: "press", step: "Press", title: "Heat-pressed", caption: "Heat and pressure turn the ink into part of the fabric." },
  { id: "reveal", step: "Reveal", title: "Colour that lasts", caption: "Peel the paper: the design can't crack or peel off." },
  { id: "transfer", step: "Transfer", title: "Panels at scale", caption: "Full squads move through the press in one run." },
  { id: "stitch", step: "Stitch", title: "Cut & sewn here", caption: "Our stitching hall turns printed panels into garments." },
  { id: "finish", step: "Finish", title: "Checked by hand", caption: "Sizes, names and numbers checked before packing." },
  { id: "pack", step: "Pack", title: "Ready to ship", caption: "Bagged and boxed, sorted per order." },
];
