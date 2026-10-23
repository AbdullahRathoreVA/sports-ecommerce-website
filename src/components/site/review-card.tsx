import Image from "next/image";
import { BadgeCheck, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_LABEL } from "@/lib/reviews/demo";

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
  title?: string | null;
  response?: string | null;
  isDemo?: boolean;
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

/** One client review. Only ever rendered for reviews the team has published (or labelled demo fixtures in development). */
export function ReviewCard({ r, dark = false, className }: { r: ReviewView; dark?: boolean; className?: string }) {
  const who = [r.role, r.company].filter(Boolean).join(", ");
  const sub = dark ? "text-white/50" : "text-muted";
  return (
    <figure className={cn("sd-rise relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border p-6", dark ? "border-white/10 bg-white/[0.04] text-white" : "hairline bg-surface", r.isDemo && "border-dashed border-amber-500/70", className)}>
      {r.isDemo && <p className="-mx-6 -mt-6 mb-4 bg-amber-400 px-6 py-1.5 text-center text-[11px] font-bold tracking-wide text-black">{DEMO_LABEL}</p>}
      <Quote className="absolute right-5 top-5 h-8 w-8 text-accent/25" aria-hidden />
      {r.rating ? (
        <p className="flex items-center gap-2">
          <Stars value={r.rating} />
          <span className={cn("text-xs font-medium", sub)}>{r.rating} out of 5</span>
        </p>
      ) : null}
      {r.title && <p className="mt-3 font-semibold leading-snug">{r.title}</p>}
      {r.photo && (
        <div className="relative mt-4 aspect-[16/10] overflow-hidden rounded-xl bg-black/20">
          <Image src={r.photo} alt={`Photo from ${r.author}`} fill sizes="(min-width:1024px) 30vw, 90vw" className="object-cover" />
        </div>
      )}
      <blockquote className="mt-3 flex-1 whitespace-pre-line break-words text-[15.5px] leading-relaxed">&ldquo;{r.quote}&rdquo;</blockquote>
      {r.response && (
        <div className={cn("mt-4 rounded-lg border-l-2 border-accent p-3 text-sm", dark ? "bg-white/[0.05]" : "bg-surface-2")}>
          <p className="text-xs font-semibold">Reply from Alrobel Sportswear</p>
          <p className={cn("mt-1 whitespace-pre-line break-words", sub)}>{r.response}</p>
        </div>
      )}
      <figcaption className="mt-6 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent font-semibold text-white" aria-hidden>
          {r.author.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold">
            {r.author}
            {r.verified && !r.isDemo && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-500">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified buyer
                <span className="sr-only"> — this review was matched to a real order</span>
              </span>
            )}
          </span>
          <span className={cn("block truncate text-xs", sub)}>{[who, r.country].filter(Boolean).join(" · ")}</span>
          <span className={cn("block text-xs", dark ? "text-white/40" : "text-subtle")}>
            {[r.productLine, r.createdAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" })].filter(Boolean).join(" · ")}
          </span>
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
