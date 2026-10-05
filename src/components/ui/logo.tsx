import { cn } from "@/lib/utils";

/**
 * Brand mark + wordmark. The mark is deliberately name-agnostic — a volt tile
 * crossed by a diagonal stitch line (sewing + speed) — so it survives a
 * rename; the wordmark text comes from site settings.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-8 w-8 shrink-0", className)}>
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#cdf54a" />
      <path d="M8 23.5 L23.5 8" stroke="#0c0d10" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M8.5 16.5 L16.5 8.5 M15.5 23.5 L23.5 15.5" stroke="#0c0d10" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2.2 2.4" />
    </svg>
  );
}

export function Logo({ name, className }: { name: string; className?: string; tone?: "light" | "dark" }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-white", className)}>
      <LogoMark />
      <span className="font-display text-[1.45rem] leading-none tracking-[0.02em]">{name}</span>
    </span>
  );
}
