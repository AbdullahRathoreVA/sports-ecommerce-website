"use client";

import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Factory location. A styled placeholder shows first; Google Maps loads only
 * when the visitor asks for it (faster pages, no third-party cookies until then).
 */
export function FactoryMap({ address, mapsUrl, className }: { address: string; mapsUrl?: string; className?: string }) {
  const [show, setShow] = useState(false);
  const query = encodeURIComponent(address);
  const directions = mapsUrl || `https://www.google.com/maps/search/?api=1&query=${query}`;
  return (
    <div className={cn("on-dark relative overflow-hidden rounded-[var(--radius-card)] bg-ink-2", className)}>
      {show ? (
        <iframe
          title={`Map: ${address}`}
          src={`https://www.google.com/maps?q=${query}&output=embed`}
          className="absolute inset-0 h-full w-full border-0 grayscale-[35%] invert-[90%] hue-rotate-180"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <button type="button" onClick={() => setShow(true)} className="group absolute inset-0 text-left" aria-label={`Show ${address} on the map`}>
          <svg className="absolute inset-0 h-full w-full text-white/[0.07]" aria-hidden>
            <defs>
              <pattern id="map-grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M44 0H0V44" fill="none" stroke="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#map-grid)" />
            <path d="M-20 260 C120 200 220 300 380 220 S620 140 820 210" fill="none" stroke="currentColor" strokeWidth="10" />
            <path d="M120 -20 C160 120 140 260 210 420" fill="none" stroke="currentColor" strokeWidth="6" />
          </svg>
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
            <span className="absolute left-1/2 top-full h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/40 animate-ping" />
            <MapPin className="relative h-10 w-10 fill-accent text-accent drop-shadow" aria-hidden />
          </span>
          <span className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-md bg-ink/90 p-3 backdrop-blur">
            <span className="min-w-0">
              <span className="label block text-[0.58rem] text-white/45">Factory location</span>
              <span className="block truncate text-sm font-semibold text-white">{address}</span>
            </span>
            <span className="shrink-0 rounded-sm bg-accent px-3 py-2 text-xs font-semibold text-white">Show map</span>
          </span>
        </button>
      )}
      <a
        href={directions}
        target="_blank"
        rel="noopener"
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-sm bg-ink/85 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-ink"
      >
        <Navigation className="h-3.5 w-3.5" aria-hidden /> Directions
      </a>
    </div>
  );
}
