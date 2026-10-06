import { cn } from "@/lib/utils";

/**
 * Alrobel Sportswear logo, redrawn as vector from the client's brand card:
 * a white "A" peak cut by a red swoosh, "ALROBEL" in a wide heavy face and
 * "SPORTS WEAR" in red. Replace with the original artwork file when supplied.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 96" aria-hidden="true" className={cn("h-9 w-auto shrink-0", className)}>
      {/* The "A": two heavy legs meeting at a sharp peak, no crossbar. */}
      <path d="M6 92 L52 4 L98 92 H74 L52 48 L30 92 Z" fill="currentColor" />
      {/* Red swoosh slicing up through the right leg. */}
      <path d="M22 78 C46 64 74 44 118 18 C96 40 70 60 40 80 Z" fill="#e11d26" />
    </svg>
  );
}

export function Logo({ className, tagline = false }: { name?: string; className?: string; tone?: "light" | "dark"; tagline?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-[family-name:var(--font-logo)] text-[1.35rem] font-extrabold tracking-[0.02em]">
          ALROBEL<sup className="ml-0.5 align-super text-[0.4em] font-bold">®</sup>
        </span>
        <span className="mt-[3px] font-[family-name:var(--font-logo)] text-[0.6rem] font-bold italic tracking-[0.42em] text-[#e11d26]">SPORTS WEAR</span>
        {tagline && <span className="label mt-2 text-[0.55rem] tracking-[0.22em] opacity-60">We make to your wishes</span>}
      </span>
    </span>
  );
}
