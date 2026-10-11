"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { ImageUp, RotateCcw, Trash2, X } from "lucide-react";
import { QuoteForm } from "@/components/forms/quote-form";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";
import type { GearDesign, GearKind } from "@/components/three/gear-studio-scene";

const GearStudioScene = dynamic(() => import("@/components/three/gear-studio-scene"), { ssr: false });

const SWATCHES = ["#e11d26", "#7f1d1d", "#f97316", "#facc15", "#a3e635", "#15803d", "#0ea5e9", "#1f3fe0", "#1e2a4a", "#7c3aed", "#ec4899", "#0b0c0e", "#ffffff", "#6b7280"];

const GLOVE_CUTS = ["Flat palm", "Roll finger", "Negative cut", "Hybrid"] as const;
const BALL_SIZES = ["Size 5 (adults)", "Size 4 (ages 8–12)", "Size 3 (under 8)"] as const;
const BALL_USES = ["Match", "Training", "Promotional / gift"] as const;

const DEFAULT: GearDesign = { accent: "#e11d26", panel: "#d9161f", base: "#ebeae6", seam: "#26272b", crest: null };

function Swatches({ label, value, onPick }: { label: string; value: string; onPick: (hex: string) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {SWATCHES.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={`${label}: ${hex}`}
            aria-pressed={value === hex}
            onClick={() => onPick(hex)}
            className={cn("h-10 w-10 rounded-full ring-offset-2 transition", value === hex ? "ring-2 ring-accent" : "ring-1 ring-black/15 hover:ring-black/30")}
            style={{ background: hex }}
          />
        ))}
        <label className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-dashed border-black/25 text-xs font-semibold" title="Custom colour">
          +
          <input type="color" value={value} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${label}: custom colour`} />
        </label>
      </div>
    </fieldset>
  );
}

function Choice<T extends string>({ label, options, value, onPick }: { label: string; options: readonly T[]; value: T; onPick: (v: T) => void }) {
  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={value === o} onClick={() => onPick(o)} className={cn("h-11 rounded-full border px-4 text-sm font-medium transition-colors", value === o ? "border-accent bg-accent text-accent-ink" : "hairline bg-surface hover:border-black/30")}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GearDesigner({ kind, products, whatsapp, responseTime }: { kind: GearKind; products: { slug: string; name: string; category: string; moq: number }[]; whatsapp: string; responseTime: string }) {
  const [design, setDesign] = useState<GearDesign>(DEFAULT);
  const [crestUrl, setCrestUrl] = useState<string | null>(null);
  const [cut, setCut] = useState<(typeof GLOVE_CUTS)[number]>("Roll finger");
  const [size, setSize] = useState<(typeof BALL_SIZES)[number]>("Size 5 (adults)");
  const [use, setUse] = useState<(typeof BALL_USES)[number]>("Match");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | undefined>();
  const rotation = useRef(0);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const stageCanvas = useRef<HTMLCanvasElement | null>(null);
  const started = useRef(false);

  const update = (patch: Partial<GearDesign>) => {
    setDesign((d) => ({ ...d, ...patch }));
    if (!started.current) {
      started.current = true;
      track("customizer_start", { label: `design-studio-${kind}` });
    }
  };

  function onCrest(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > 3_000_000) {
      alert("Please choose a PNG, JPG, WebP or SVG under 3 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Square canvas, crest centred: it is printed on one hexagon of the ball.
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      const s = Math.min(200 / img.naturalWidth, 200 / img.naturalHeight);
      ctx.drawImage(img, (256 - img.naturalWidth * s) / 2, (256 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      URL.revokeObjectURL(url);
      setCrestUrl(c.toDataURL("image/png"));
      update({ crest: c });
    };
    img.src = url;
  }

  function openQuote() {
    const preview = stageCanvas.current?.toDataURL("image/webp", 0.82);
    setSnapshot(
      kind === "gloves"
        ? { kind: "goalkeeper-gloves", colours: { trim: design.accent }, cut, crest: crestUrl, preview }
        : { kind: "football", colours: { panels: design.panel, ball: design.base, stitching: design.seam }, size, use, crest: crestUrl, preview },
    );
    setQuoteOpen(true);
  }

  return (
    <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-10">
      <div className="on-dark sticky top-[var(--header-h)] z-20 -mx-4 bg-ink sm:-mx-6 lg:static lg:mx-0 lg:h-[calc(100svh-var(--header-h)-140px)] lg:min-h-[520px] lg:rounded-[22px]">
        <div
          className="relative h-[46svh] min-h-[300px] select-none lg:h-full"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => (drag.current = { x: e.clientX, start: rotation.current })}
          onPointerMove={(e) => {
            if (drag.current && e.buttons) rotation.current = drag.current.start + (e.clientX - drag.current.x) * 0.012;
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(55% 55% at 50% 45%, rgba(225,29,38,0.16), transparent 70%)" }} />
          <GearStudioScene kind={kind} design={design} rotationRef={rotation} onCanvas={(c) => (stageCanvas.current = c)} className="!absolute !inset-0" />
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-white/50">
            {kind === "gloves" ? "Your goalkeeper gloves" : "Your match ball"} · drag to rotate
          </p>
        </div>
      </div>

      <div className="space-y-6 pt-5 lg:pt-0">
        {kind === "gloves" ? (
          <>
            <Swatches label="Backhand & trim colour" value={design.accent} onPick={(hex) => update({ accent: hex })} />
            <Choice label="Glove cut" options={GLOVE_CUTS} value={cut} onPick={setCut} />
            <p className="text-sm text-muted">White latex palm with a black backhand. Palm grade, closure and sizes (kids to adult) are confirmed with your quote; a sample is available before bulk.</p>
          </>
        ) : (
          <>
            <Swatches label="Panel colour" value={design.panel} onPick={(hex) => update({ panel: hex })} />
            <Swatches label="Ball colour" value={design.base} onPick={(hex) => update({ base: hex })} />
            <Swatches label="Stitching" value={design.seam} onPick={(hex) => update({ seam: hex })} />
            <Choice label="Size" options={BALL_SIZES} value={size} onPick={setSize} />
            <Choice label="Use" options={BALL_USES} value={use} onPick={setUse} />
          </>
        )}

        <div className="space-y-3">
          <p className="text-sm font-semibold">{kind === "gloves" ? "Your logo (strap & backhand)" : "Your crest on the ball"}</p>
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-black/15 bg-surface p-5 text-center hover:border-accent">
            <ImageUp className="h-6 w-6 text-accent" aria-hidden />
            <span className="font-semibold">Upload your logo</span>
            <span className="text-xs text-subtle">PNG with transparent background works best · max 3 MB</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => onCrest(e.target.files?.[0])} />
          </label>
          {crestUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={crestUrl} alt="Your logo" className="h-14 w-14 rounded-md bg-surface-2 object-contain p-1" />
              <button
                type="button"
                onClick={() => {
                  setCrestUrl(null);
                  update({ crest: null });
                }}
                className="inline-flex h-10 items-center gap-2 text-sm font-semibold text-muted hover:text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Remove
              </button>
              {kind === "gloves" && <span className="text-xs text-subtle">Shown on your quote; we place it on the strap and backhand.</span>}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 border-t hairline bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDesign(DEFAULT);
                setCrestUrl(null);
              }}
              aria-label="Reset design"
              className="grid shrink-0 place-items-center rounded-[var(--radius-control)] border hairline bg-surface"
              style={{ height: 52, width: 52 }}
            >
              <RotateCcw className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={openQuote} className="flex flex-1 items-center justify-center rounded-[var(--radius-control)] bg-accent text-[15px] font-semibold text-accent-ink" style={{ height: 52 }}>
              Request a quote for this design
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-subtle">Minimum order 50 pieces · sample $150 · final artwork confirmed before production.</p>
        </div>
      </div>

      {quoteOpen && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Request a quote for your design">
          <div className="absolute inset-0 bg-black/50" onClick={() => setQuoteOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 top-[5svh] overflow-y-auto rounded-t-[22px] bg-paper p-5 sm:p-8 lg:inset-y-6 lg:left-auto lg:right-6 lg:w-[620px] lg:rounded-[22px]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xl font-semibold">Quote for your design</p>
              <button type="button" onClick={() => setQuoteOpen(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-surface-2">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {typeof snapshot?.preview === "string" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapshot.preview} alt="Your design" className="mx-auto mb-5 max-h-72 w-auto rounded-xl bg-ink" />
            )}
            <QuoteForm
              products={products}
              initialProduct={kind === "gloves" ? "custom-goalkeeper-gloves" : "custom-match-football"}
              initialQty={50}
              whatsapp={whatsapp}
              responseTime={responseTime}
              source="DESIGN_STUDIO"
              design={snapshot}
            />
          </div>
        </div>
      )}
    </div>
  );
}
