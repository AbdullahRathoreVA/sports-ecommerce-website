"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin charts — single-series by design (no dual axes, no rainbow): one
 * volt line on carbon, hairline grid, crosshair + tooltip on hover, arrow-key
 * navigation, and a table view for every chart.
 */

export type Point = { label: string; value: number };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

const FORMATS = {
  number: (v: number) => Math.round(v).toLocaleString("en-US"),
  money: (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100),
};

export function LineChart({
  data,
  kind = "number",
  height = 200,
  name,
}: {
  data: Point[];
  /** A name, not a function — server pages pass this across the client boundary. */
  kind?: keyof typeof FORMATS;
  height?: number;
  name: string;
}) {
  const format = FORMATS[kind];
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 440;
  const H = height;
  const pad = { t: 12, r: 10, b: 24, l: 46 };
  const max = useMemo(() => niceMax(Math.max(0, ...data.map((d) => d.value))), [data]);
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = data.length ? `${path} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z` : "";
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const labelIdx = data.length > 2 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : data.map((_, i) => i);

  function pick(clientX: number) {
    const svg = svgRef.current;
    if (!svg || data.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-pan-y outline-none"
          role="img"
          aria-label={`${name}: ${data.length} points, max ${format(Math.max(0, ...data.map((d) => d.value)))}`}
          tabIndex={0}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover((v) => v ?? data.length - 1)}
          onBlur={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? data.length) - 1));
            if (e.key === "ArrowRight") setHover((v) => Math.min(data.length - 1, (v ?? -1) + 1));
          }}
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((tv) => (
            <g key={tv}>
              <line x1={pad.l} x2={W - pad.r} y1={y(tv)} y2={y(tv)} stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" />
              <text x={pad.l - 8} y={y(tv) + 4} textAnchor="end" className="fill-[var(--color-subtle)] text-[12px] tabular-nums">
                {format(tv)}
              </text>
            </g>
          ))}
          {area && <path d={area} fill={`url(#${id}-fill)`} />}
          {path && <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
          {labelIdx.map((i) => (
            <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-[var(--color-subtle)] text-[12px]">
              {data[i]?.label}
            </text>
          ))}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgb(255 255 255 / 0.25)" strokeWidth="1" />
              <circle cx={x(hover)} cy={y(h.value)} r="5" fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth="2" />
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border hairline bg-ink-2 px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%` }}
            role="status"
          >
            <p className="text-subtle">{h.label}</p>
            <p className="font-semibold tabular-nums text-fg">{format(h.value)}</p>
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-subtle">
        <summary className="cursor-pointer select-none hover:text-fg">View as table</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border hairline">
          <table className="w-full text-left">
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-b hairline last:border-0">
                  <td className="px-3 py-1.5">{d.label}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-fg">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/** Horizontal bars with direct labels — magnitude across nominal categories, one colour. */
export function BarList({ data, format = (v) => v.toLocaleString("en-US"), max, empty = "No data in this period" }: { data: Point[]; format?: (v: number) => string; max?: number; empty?: string }) {
  if (data.length === 0) return <p className="py-6 text-center text-sm text-subtle">{empty}</p>;
  const top = max ?? Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-fg">{d.label}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {format(d.value)} <span className="text-subtle">· {total ? Math.round((d.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-accent/80" style={{ width: `${Math.max(2, (d.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Conversion funnel: ordered stages, step-to-step rate shown as text. */
export function Funnel({ steps }: { steps: { label: string; sessions: number }[] }) {
  const first = steps[0]?.sessions || 1;
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1]!.sessions : null;
        const stepRate = prev ? s.sessions / prev : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-fg">
                <span className="mr-2 font-mono text-xs text-subtle">{String(i + 1).padStart(2, "0")}</span>
                {s.label}
              </span>
              <span className="tabular-nums text-muted">
                {s.sessions.toLocaleString("en-US")}
                {stepRate !== null && <span className={cn("ml-2 text-xs", stepRate < 0.2 ? "text-red-300" : "text-subtle")}>{(stepRate * 100).toFixed(1)}% of previous</span>}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(1.5, (s.sessions / first) * 100)}%`, opacity: 1 - i * 0.13 }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
