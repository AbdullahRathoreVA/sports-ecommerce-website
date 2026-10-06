"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageUp, RotateCcw, Trash2, X } from "lucide-react";
import { PATTERNS, PRESETS, renderJersey, syncCanvasFont, CANVAS_W, CANVAS_H, type JerseyDesign, type Pattern } from "@/lib/jersey/design";
import { QuoteForm } from "@/components/forms/quote-form";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const JerseyScene = dynamic(() => import("@/components/three/jersey-scene"), { ssr: false });

const SWATCHES = ["#0b0c0e", "#ffffff", "#1f3fe0", "#0ea5e9", "#0f766e", "#15803d", "#a3e635", "#facc15", "#e9b949", "#f97316", "#c81e1e", "#7f1d1d", "#ec4899", "#7c3aed", "#1e2a4a", "#6b7280"];

type Tab = "style" | "colours" | "text" | "logo";

function supports3d() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function DesignStudio({
  products,
  whatsapp,
  responseTime,
}: {
  products: { slug: string; name: string; category: string; moq: number }[];
  whatsapp: string;
  responseTime: string;
}) {
  const [design, setDesign] = useState<JerseyDesign>({ ...(PRESETS[0]!.design as JerseyDesign), crest: null });
  const [tab, setTab] = useState<Tab>("style");
  const [view, setView] = useState<"front" | "back">("front");
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [revision, setRevision] = useState(0);
  const [use3d, setUse3d] = useState<boolean | null>(null);
  const [crestUrl, setCrestUrl] = useState<string | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Record<string, unknown> | undefined>();
  const rotation = useRef(0);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const flatRef = useRef<HTMLCanvasElement>(null);
  const started = useRef(false);

  useEffect(() => {
    setUse3d(supports3d());
    document.fonts?.ready.then(() => {
      syncCanvasFont();
      setCanvas(document.createElement("canvas"));
    });
  }, []);

  // Re-render artwork whenever the design changes.
  useEffect(() => {
    if (!canvas) return;
    renderJersey(design, canvas);
    setRevision((r) => r + 1);
    const flat = flatRef.current;
    if (flat) {
      flat.width = CANVAS_W / 2;
      flat.height = CANVAS_H;
      flat.getContext("2d")!.drawImage(canvas, view === "front" ? 0 : CANVAS_W / 2, 0, CANVAS_W / 2, CANVAS_H, 0, 0, CANVAS_W / 2, CANVAS_H);
    }
  }, [design, canvas, view]);

  useEffect(() => {
    rotation.current = view === "front" ? 0 : Math.PI;
  }, [view]);

  const update = useCallback((patch: Partial<JerseyDesign>) => {
    setDesign((d) => ({ ...d, ...patch }));
    if (!started.current) {
      started.current = true;
      track("customizer_start", { label: "design-studio" });
    }
  }, []);

  function onCrest(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > 3_000_000) {
      alert("Please choose a PNG, JPG, WebP or SVG under 3 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Downscale once: keeps the canvas fast and the quote payload small.
      const max = 256;
      const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      setCrestUrl(c.toDataURL("image/png"));
      update({ crest: c });
    };
    img.src = url;
  }

  function openQuote() {
    if (!canvas) return;
    // A small preview of both sides travels with the quote request.
    const preview = document.createElement("canvas");
    preview.width = 640;
    preview.height = 320;
    preview.getContext("2d")!.drawImage(canvas, 0, 0, 640, 320);
    setSnapshot({
      kind: "sublimated-jersey",
      pattern: design.pattern,
      colours: { base: design.base, accent: design.accent, trim: design.trim, text: design.textColor },
      sponsor: design.sponsor,
      sampleName: design.name,
      sampleNumber: design.number,
      hasCrest: Boolean(design.crest),
      crest: crestUrl,
      preview: preview.toDataURL("image/webp", 0.8),
    });
    setQuoteOpen(true);
  }

  const patternLabel = useMemo(() => PATTERNS.find((p) => p.id === design.pattern)?.label, [design.pattern]);

  return (
    <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-10">
      {/* ── Stage ─────────────────────────────────────────────────────── */}
      <div className="on-dark sticky top-[var(--header-h)] z-20 -mx-4 bg-ink sm:-mx-6 lg:static lg:mx-0 lg:h-[calc(100svh-var(--header-h)-80px)] lg:min-h-[560px] lg:rounded-[22px]">
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
          {use3d && canvas ? (
            <JerseyScene textureA={canvas} rotationRef={rotation} active revision={revision} autoRotate={false} className="!absolute !inset-0" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-8">
              <canvas ref={flatRef} className="h-full max-h-[420px] w-auto rounded-xl" aria-label={`${view} of your jersey design`} />
            </div>
          )}
          <div className="absolute inset-x-0 top-3 flex justify-center gap-2">
            {(["front", "back"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={cn("h-10 rounded-full px-4 text-sm font-semibold capitalize backdrop-blur transition-colors", view === v ? "bg-white text-ink" : "bg-white/10 text-white hover:bg-white/20")}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-white/50">
            {patternLabel} · {use3d ? "drag to rotate" : "preview"}
          </p>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <div className="pt-5 lg:pt-0">
        <div role="tablist" aria-label="Design options" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1">
          {(["style", "colours", "text", "logo"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              aria-controls={`panel-${t}`}
              onClick={() => setTab(t)}
              className={cn("h-11 rounded-lg text-sm font-semibold capitalize transition-colors", tab === t ? "bg-ink text-white shadow-sm" : "text-muted")}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-5 min-h-[300px]">
          {tab === "style" && (
            <div id="panel-style" role="tabpanel" className="space-y-6">
              <div>
                <p className="text-sm font-semibold">Start from a preset</p>
                <ul className="mt-3 grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => update({ ...p.design })}
                        className="flex w-full flex-col items-center gap-2 rounded-xl border hairline bg-surface p-3 text-xs font-medium hover:border-accent"
                      >
                        <span className="flex h-8 w-full overflow-hidden rounded-md">
                          <span className="flex-1" style={{ background: p.design.base }} />
                          <span className="w-1/3" style={{ background: p.design.accent }} />
                          <span className="w-2" style={{ background: p.design.trim }} />
                        </span>
                        {p.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold">Pattern</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {PATTERNS.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={design.pattern === p.id}
                        onClick={() => update({ pattern: p.id as Pattern })}
                        className={cn("h-11 rounded-full border px-4 text-sm font-medium transition-colors", design.pattern === p.id ? "border-accent bg-accent text-accent-ink" : "hairline bg-surface hover:border-white/35")}
                      >
                        {p.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === "colours" && (
            <div id="panel-colours" role="tabpanel" className="space-y-5">
              {(
                [
                  ["base", "Main colour"],
                  ["accent", "Pattern colour"],
                  ["trim", "Collar & cuffs"],
                  ["textColor", "Text & numbers"],
                ] as const
              ).map(([key, label]) => (
                <fieldset key={key}>
                  <legend className="text-sm font-semibold">{label}</legend>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`${label}: ${hex}`}
                        aria-pressed={design[key] === hex}
                        onClick={() => update({ [key]: hex })}
                        className={cn("h-10 w-10 rounded-full ring-offset-2 transition", design[key] === hex ? "ring-2 ring-accent" : "ring-1 ring-white/10 hover:ring-white/25")}
                        style={{ background: hex }}
                      />
                    ))}
                    <label className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-dashed border-white/25 text-xs font-semibold" title="Custom colour">
                      +
                      <input type="color" value={design[key]} onChange={(e) => update({ [key]: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${label}: custom colour`} />
                    </label>
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {tab === "text" && (
            <div id="panel-text" role="tabpanel" className="space-y-4">
              {(
                [
                  ["sponsor", "Sponsor (front)", 20, "YOUR SPONSOR"],
                  ["name", "Player name (back)", 14, "CARTER"],
                  ["number", "Number", 2, "9"],
                ] as const
              ).map(([key, label, max, ph]) => (
                <div key={key}>
                  <label htmlFor={`st-${key}`} className="text-sm font-semibold">
                    {label}
                  </label>
                  <input
                    id={`st-${key}`}
                    value={design[key]}
                    maxLength={max}
                    placeholder={ph}
                    inputMode={key === "number" ? "numeric" : "text"}
                    onChange={(e) => update({ [key]: key === "number" ? e.target.value.replace(/\D/g, "") : e.target.value })}
                    className="mt-2 h-12 w-full rounded-[var(--radius-control)] border border-white/12 bg-surface px-3.5 text-[16px] uppercase outline-none focus:border-accent"
                  />
                </div>
              ))}
              <p className="text-xs text-subtle">Every player gets their own name and number — send us your roster with the quote.</p>
            </div>
          )}

          {tab === "logo" && (
            <div id="panel-logo" role="tabpanel" className="space-y-4">
              <p className="text-sm text-muted">Add your crest to see it on the chest. It stays in your browser until you send a quote request.</p>
              <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-white/12 bg-surface p-6 text-center hover:border-accent">
                <ImageUp className="h-7 w-7 text-accent" aria-hidden />
                <span className="font-semibold">Upload crest or logo</span>
                <span className="text-xs text-subtle">PNG with transparent background works best · max 3 MB</span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => onCrest(e.target.files?.[0])} />
              </label>
              {design.crest && (
                <button type="button" onClick={() => { setCrestUrl(null); update({ crest: null }); }} className="inline-flex h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-danger">
                  <Trash2 className="h-4 w-4" aria-hidden /> Remove crest
                </button>
              )}
              <div>
                <p className="text-sm font-semibold">Crest shape (placeholder)</p>
                <div className="mt-2 flex gap-2">
                  {(["shield", "circle"] as const).map((sh) => (
                    <button key={sh} type="button" aria-pressed={(design.crestShape ?? "shield") === sh} onClick={() => update({ crestShape: sh })} className={cn("h-11 rounded-full border px-4 text-sm font-medium capitalize", (design.crestShape ?? "shield") === sh ? "border-accent bg-accent text-accent-ink" : "hairline bg-surface")}>
                      {sh}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-6 border-t hairline bg-paper/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => update({ ...(PRESETS[0]!.design as JerseyDesign), crest: null })}
              aria-label="Reset design"
              className="grid h-13 w-13 shrink-0 place-items-center rounded-[var(--radius-control)] border hairline bg-surface"
              style={{ height: 52, width: 52 }}
            >
              <RotateCcw className="h-5 w-5" aria-hidden />
            </button>
            <button type="button" onClick={openQuote} className="flex h-13 flex-1 items-center justify-center rounded-[var(--radius-control)] bg-accent text-[15px] font-semibold text-accent-ink" style={{ height: 52 }}>
              Request a quote for this design
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-subtle">Your design goes to our sales team with the request. Final artwork is confirmed before production.</p>
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
              <img src={snapshot.preview} alt="Front and back of your design" className="mb-5 w-full rounded-xl bg-ink" />
            )}
            <QuoteForm products={products} initialProduct="custom-sublimated-football-kit" whatsapp={whatsapp} responseTime={responseTime} source="DESIGN_STUDIO" design={snapshot} />
          </div>
        </div>
      )}
    </div>
  );
}
