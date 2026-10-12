import Image from "next/image";
import { BadgeCheck, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReviewView = {
  id: string;
  author: string;
  role: string | null;
  company: string | null;
  country: string | null;
  quote: string;
  rating: number | null;
  photo: string | null;
  productLine: string | null;
  verified: boolean;
  createdAt: Date;
};

export function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5", className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-4 w-4", i <= value ? "fill-[#f5b301] text-[#f5b301]" : "text-white/25")} aria-hidden />
      ))}
    </span>
  );
}

/** One client review. Only ever rendered for reviews the team has published. */
export function ReviewCard({ r, dark = false, className }: { r: ReviewView; dark?: boolean; className?: string }) {
  const who = [r.role, r.company].filter(Boolean).join(", ");
  return (
    <figure className={cn("sd-rise tilt-hover relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border p-6", dark ? "border-white/10 bg-white/[0.04] text-white" : "hairline bg-surface", className)}>
      <Quote className="absolute right-5 top-5 h-8 w-8 text-accent/25" aria-hidden />
      {r.rating ? <Stars value={r.rating} /> : null}
      {r.photo && (
        <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-black/20">
          <Image src={r.photo} alt={`Photo from ${r.author}`} fill sizes="(min-width:1024px) 30vw, 90vw" className="object-cover" />
        </div>
      )}
      <blockquote className="mt-4 flex-1 text-[15.5px] leading-relaxed">&ldquo;{r.quote}&rdquo;</blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent font-semibold text-white" aria-hidden>
          {r.author.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {r.author}
            {r.verified && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-500" title="Matched to a real order">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified buyer
              </span>
            )}
          </span>
          <span className={cn("block truncate text-xs", dark ? "text-white/50" : "text-muted")}>{[who, r.country].filter(Boolean).join(" · ")}</span>
          {r.productLine && <span className={cn("block text-xs", dark ? "text-white/40" : "text-subtle")}>{r.productLine}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

export function averageRating(reviews: { rating: number | null }[]) {
  const rated = reviews.filter((r) => r.rating);
  if (rated.length === 0) return null;
  return { value: rated.reduce((n, r) => n + (r.rating ?? 0), 0) / rated.length, count: rated.length };
}
