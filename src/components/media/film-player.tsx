"use client";

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

export type Film = { src: string; poster: string; title: string; duration: string; captions?: string };

export const FACTORY_FILM: Film = {
  src: "/media/films/factory-tour.mp4",
  poster: "/media/films/factory-tour.webp",
  title: "Factory tour",
  duration: "1:52",
  captions: "/media/films/factory-tour.vtt",
};

export const SHORT_FILM: Film = {
  src: "/media/films/sublimation-short.mp4",
  poster: "/media/films/sublimation-short.webp",
  title: "Sublimation in 35 seconds",
  duration: "0:35",
};

/**
 * Plays a film in an accessible modal: focus moves in, Escape closes, page
 * scroll locks, and the 9 MB file is only requested after the click.
 */
export function FilmButton({ film = FACTORY_FILM, className, variant = "dark" }: { film?: Film; className?: string; variant?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          track("video_play", { label: film.title });
        }}
        className={cn(
          "group inline-flex h-14 items-center gap-3 rounded-full pl-2 pr-5 text-[15px] font-semibold transition-colors",
          variant === "dark" ? "bg-white/[0.07] text-white hover:bg-white/[0.12]" : "bg-white text-ink hover:bg-white/90",
          className,
        )}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink transition-transform group-hover:scale-105">
          <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
        </span>
        Watch the {film.title.toLowerCase()} <span className="font-mono text-xs opacity-60">{film.duration}</span>
      </button>
      {open && <FilmModal film={film} onClose={() => setOpen(false)} />}
    </>
  );
}

export function FilmModal({ film, onClose }: { film: Film; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={film.title}
      className="fixed inset-0 z-[70] grid place-items-center bg-black/90 p-3 backdrop-blur-sm animate-fade sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6 sm:top-6"
      >
        <X className="h-6 w-6" aria-hidden />
      </button>
      <video
        className="max-h-[86svh] w-auto max-w-full rounded-2xl bg-black shadow-2xl"
        src={film.src}
        poster={film.poster}
        controls
        autoPlay
        playsInline
      >
        {film.captions && <track kind="captions" src={film.captions} srcLang="en" label="English" default />}
      </video>
    </div>
  );
}
