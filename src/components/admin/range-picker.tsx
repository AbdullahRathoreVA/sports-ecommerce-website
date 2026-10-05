"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { RANGE_OPTIONS } from "@/lib/admin/range";
import { cn } from "@/lib/utils";

/** Date-range filter: presets + custom range, one row above the charts. */
export function RangePicker({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState(active === "custom");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.push(`${pathname}?${next.toString()}`));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-xl border hairline bg-surface p-1" role="group" aria-label="Date range">
        {RANGE_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={active === o.key}
            onClick={() => {
              setCustom(false);
              go({ range: o.key, from: null, to: null });
            }}
            className={cn("h-9 rounded-lg px-3 text-sm font-medium transition-colors", active === o.key ? "bg-white text-ink" : "text-muted hover:text-fg")}
          >
            {o.label}
          </button>
        ))}
        <button type="button" aria-pressed={active === "custom"} onClick={() => setCustom((v) => !v)} className={cn("h-9 rounded-lg px-3 text-sm font-medium", active === "custom" ? "bg-white text-ink" : "text-muted hover:text-fg")}>
          Custom
        </button>
      </div>
      {custom && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (from && to) go({ range: "custom", from, to });
          }}
        >
          <label className="sr-only" htmlFor="rp-from">From</label>
          <input id="rp-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border hairline bg-surface px-2 text-sm" />
          <span className="text-subtle">–</span>
          <label className="sr-only" htmlFor="rp-to">To</label>
          <input id="rp-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border hairline bg-surface px-2 text-sm" />
          <button type="submit" className="h-10 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-ink">
            Apply
          </button>
        </form>
      )}
      {pending && <Loader2 className="h-4 w-4 animate-spin text-subtle" aria-label="Loading" />}
    </div>
  );
}
