import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border hairline bg-surface", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b hairline px-4 py-3 sm:px-5">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/** KPI tile: the number is the chart; delta vs the previous equal period. */
export function StatTile({
  label,
  value,
  current,
  previous,
  invert = false,
  hint,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  invert?: boolean;
  hint?: string;
}) {
  let delta: number | null = null;
  if (current !== undefined && previous !== undefined && previous !== 0) delta = (current - previous) / previous;
  const good = delta === null ? null : invert ? delta < 0 : delta > 0;
  return (
    <div className="rounded-[var(--radius-card)] border hairline bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1.5 flex items-center gap-1 text-xs">
        {delta === null ? (
          <span className="text-subtle">{hint ?? "No prior data"}</span>
        ) : Math.abs(delta) < 0.005 ? (
          <span className="inline-flex items-center gap-1 text-subtle">
            <Minus className="h-3 w-3" aria-hidden /> No change
          </span>
        ) : (
          <span className={cn("inline-flex items-center gap-0.5 font-medium", good ? "text-emerald-400" : "text-red-300")}>
            {delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
            {Math.abs(delta * 100).toFixed(Math.abs(delta) < 0.1 ? 1 : 0)}%
            <span className="sr-only">{good ? "better" : "worse"} than previous period</span>
          </span>
        )}
        {delta !== null && <span className="text-subtle">vs previous</span>}
      </p>
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "accent" | "good" | "warn" | "bad" | "info"; className?: string }) {
  const tones = {
    neutral: "bg-white/[0.07] text-muted",
    accent: "bg-accent/15 text-accent",
    good: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-amber-500/15 text-amber-300",
    bad: "bg-red-500/15 text-red-300",
    info: "bg-sky-500/15 text-sky-300",
  };
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold", tones[tone], className)}>{children}</span>;
}

export const ORDER_TONE: Record<string, "neutral" | "accent" | "good" | "warn" | "bad" | "info"> = {
  PENDING: "warn",
  CONFIRMED: "info",
  PROCESSING: "info",
  MANUFACTURING: "accent",
  SHIPPED: "info",
  DELIVERED: "good",
  CANCELLED: "bad",
  REFUNDED: "bad",
};
export const PAYMENT_TONE: Record<string, "neutral" | "accent" | "good" | "warn" | "bad" | "info"> = {
  UNPAID: "warn",
  PENDING: "warn",
  PARTIALLY_PAID: "info",
  PAID: "good",
  REFUNDED: "bad",
  FAILED: "bad",
};
export const LEAD_TONE: Record<string, "neutral" | "accent" | "good" | "warn" | "bad" | "info"> = {
  NEW: "accent",
  CONTACTED: "info",
  QUALIFIED: "info",
  QUOTED: "warn",
  NEGOTIATING: "warn",
  WON: "good",
  LOST: "bad",
};

export function humanise(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

export function DemoNotice({ show, includeDemo, href }: { show: boolean; includeDemo: boolean; href: (demo: boolean) => string }) {
  if (!show) return null;
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted">
        {includeDemo ? (
          <>
            <span className="font-semibold text-accent">Includes simulated demo data</span> so you can review the dashboard before real
            traffic arrives.
          </>
        ) : (
          <>
            <span className="font-semibold text-fg">Real data only.</span> Simulated demo rows are hidden.
          </>
        )}
      </p>
      <Link href={href(!includeDemo)} className="shrink-0 font-semibold text-accent hover:underline">
        {includeDemo ? "Show real data only" : "Include demo data"}
      </Link>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/12 p-8 text-center">
      <p className="font-semibold">{title}</p>
      {body && <p className="mt-1 text-sm text-muted">{body}</p>}
    </div>
  );
}

export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="flex h-10 items-center rounded-lg border hairline px-3 font-medium hover:bg-white/[0.04]">
            Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="flex h-10 items-center rounded-lg border hairline px-3 font-medium hover:bg-white/[0.04]">
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

export const th = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-subtle";
export const td = "px-3 py-3 align-top text-sm";
