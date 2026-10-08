import { CheckCircle2, Circle, Rocket } from "lucide-react";
import type { LaunchItem } from "@/lib/admin/launch";
import { cn } from "@/lib/utils";

/** Admin overview card: what still stands between the preview and going live. */
export function LaunchChecklist({ items }: { items: LaunchItem[] }) {
  const required = items.filter((i) => i.required);
  const doneRequired = required.filter((i) => i.done).length;
  if (doneRequired === required.length) return null;
  const pct = Math.round((doneRequired / required.length) * 100);
  const sorted = [...items].sort((a, b) => Number(a.done) - Number(b.done) || Number(b.required) - Number(a.required));

  return (
    <details className="group mb-6 rounded-[var(--radius-card)] border hairline bg-surface" open>
      <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-accent/15 text-accent">
          <Rocket className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Go-live checklist</span>
          <span className="block text-sm text-muted">
            {doneRequired} of {required.length} launch steps done · ticks itself off as you go
          </span>
        </span>
        <span className="hidden w-40 sm:block" aria-hidden>
          <span className="block h-2 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </span>
        </span>
        <span className="font-mono text-sm tabular-nums text-muted">{pct}%</span>
      </summary>
      <ul className="grid gap-px border-t hairline bg-white/5 sm:grid-cols-2">
        {sorted.map((i) => (
          <li key={i.key} className="flex gap-3 bg-surface px-4 py-3.5 sm:px-5">
            {i.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden /> : <Circle className={cn("mt-0.5 h-5 w-5 shrink-0", i.required ? "text-accent" : "text-subtle")} aria-hidden />}
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", i.done && "text-muted line-through decoration-white/30")}>
                {i.label}
                {!i.required && <span className="ml-2 text-xs font-normal text-subtle">optional</span>}
              </p>
              {!i.done && (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  {i.detail && <span className="text-amber-300">{i.detail}. </span>}
                  {i.how}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}
