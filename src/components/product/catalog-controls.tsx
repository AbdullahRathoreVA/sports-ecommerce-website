"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "moq", label: "Lowest MOQ" },
  { id: "newest", label: "Newest" },
];

const MODES = [
  { id: "", label: "All" },
  { id: "buy", label: "Buy online" },
  { id: "quote", label: "Quote / bulk" },
];

export const USE_CASES = [
  { id: "clubs", label: "Clubs" },
  { id: "schools", label: "Schools" },
  { id: "brands", label: "Brands" },
  { id: "retailers", label: "Retailers" },
  { id: "riders", label: "Riders" },
  { id: "racing-teams", label: "Race teams" },
];

function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("focus");
    start(() => router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  };
  return { params, update, pending };
}

export function CatalogSearch() {
  const { params, update, pending } = useQueryUpdater();
  const [value, setValue] = useState(params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (params.get("focus") === "search") inputRef.current?.focus();
  }, [params]);

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        update({ q: value.trim() || null });
        if (value.trim()) track("search", { label: value.trim() });
      }}
    >
      <label htmlFor="catalog-search" className="sr-only">
        Search products
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" aria-hidden />
      <input
        ref={inputRef}
        id="catalog-search"
        type="search"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            update({ q: v.trim() || null });
            if (v.trim().length > 2) track("search", { label: v.trim() });
          }, 350);
        }}
        placeholder="Search: football kit, race suit, gloves…"
        className="h-13 w-full rounded-[var(--radius-control)] border hairline bg-surface pl-12 pr-12 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-[16px] outline-none transition-colors placeholder:text-subtle focus:border-accent"
        style={{ height: 52 }}
      />
      {pending && <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-subtle" aria-hidden />}
      {!pending && value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            update({ q: null });
          }}
          className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-subtle hover:bg-surface-2"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </form>
  );
}

function FilterGroups({ onChange }: { onChange?: () => void }) {
  const { params, update } = useQueryUpdater();
  const mode = params.get("mode") ?? "";
  const use = params.get("use") ?? "";
  const sort = params.get("sort") ?? "featured";
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="label text-subtle">How to buy</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => {
                update({ mode: m.id || null });
                track("filter_use", { label: `mode:${m.id || "all"}` });
                onChange?.();
              }}
              className={cn(
                "h-9 rounded-md border px-3 text-[13px] font-medium transition-colors",
                mode === m.id ? "border-accent bg-accent/10 text-accent" : "hairline bg-surface text-fg hover:border-fg/40",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label text-subtle">Made for</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <button
              key={u.id}
              type="button"
              aria-pressed={use === u.id}
              onClick={() => {
                update({ use: use === u.id ? null : u.id });
                track("filter_use", { label: `use:${u.id}` });
                onChange?.();
              }}
              className={cn(
                "h-9 rounded-md border px-3 text-[13px] font-medium transition-colors",
                use === u.id ? "border-accent bg-accent/10 text-accent" : "hairline bg-surface text-fg hover:border-fg/40",
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="sort" className="label text-subtle">
          Sort by
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => {
            update({ sort: e.target.value === "featured" ? null : e.target.value });
            track("filter_use", { label: `sort:${e.target.value}` });
            onChange?.();
          }}
          className="mt-3 h-11 w-full rounded-[var(--radius-control)] border hairline bg-surface px-3 text-[15px] outline-none focus:border-accent"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function DesktopFilters() {
  return (
    <div className="rounded-[var(--radius-card)] border hairline bg-surface p-5">
      <p className="label mb-5 flex items-center gap-2 text-fg">
        <SlidersHorizontal className="h-4 w-4 text-accent" aria-hidden /> Filters
      </p>
      <FilterGroups />
    </div>
  );
}

export function MobileFilters({ activeCount }: { activeCount: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-md border hairline bg-surface px-4 text-sm font-semibold"
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filter & sort
        {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-accent-ink">{activeCount}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Filter and sort">
          <div className="absolute inset-0 bg-black/40 animate-fade" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 max-h-[85svh] overflow-y-auto rounded-t-[22px] bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-rise">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-fg/20" aria-hidden />
            <div className="mb-5 flex items-center justify-between">
              <p className="text-lg font-semibold">Filter & sort</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close filters" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-surface-2">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <FilterGroups />
            <button type="button" onClick={() => setOpen(false)} className="mt-6 h-12 w-full rounded-[var(--radius-control)] bg-ink text-[15px] font-semibold text-white">
              Show results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
