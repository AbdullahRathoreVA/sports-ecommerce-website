import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

/**
 * Stand-in for a product or category without photos yet: on-brand, honest
 * ("photos coming soon"), and never a fake or borrowed picture.
 */
export function BrandTile({ label, className, compact = false }: { label?: string; className?: string; compact?: boolean }) {
  return (
    <div className={cn("on-dark grid-lines relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-ink text-center text-white", className)}>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" aria-hidden />
      <LogoMark className={cn("relative", compact ? "h-6" : "h-12")} />
      {!compact && label && <p className="relative mt-4 max-w-[80%] text-balance text-sm font-semibold leading-snug text-white/85">{label}</p>}
      {!compact && <p className="label relative mt-2 text-[0.58rem] text-white/45">Photos coming soon</p>}
    </div>
  );
}
