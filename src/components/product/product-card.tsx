import Link from "next/link";
import Image from "next/image";
import { Clock, Layers } from "lucide-react";
import type { ProductCard as Card } from "@/lib/catalog";
import { formatMoney, leadTimeLabel, cn } from "@/lib/utils";

/**
 * B2B-first product card: price "from", MOQ and lead time are visible without
 * a click, because those are the three facts a trade buyer qualifies a
 * supplier on. The second image swaps in on hover (pointer devices only).
 */
export function ProductCard({ product, priority = false, className }: { product: Card; priority?: boolean; className?: string }) {
  const lead = leadTimeLabel(product.leadTimeMinDays, product.leadTimeMaxDays);
  const modeLabel =
    product.purchaseMode === "QUOTE" ? "Quote only" : product.purchaseMode === "CART" ? "Buy now" : "Sample or bulk";

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group flex flex-col", className)}
      data-track="product_click"
      data-product-id={product.id}
      data-category={product.category.slug}
      data-track-label={product.name}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-surface-2">
        {product.image ? (
          <>
            <Image
              src={product.image.url}
              alt={product.image.alt}
              fill
              priority={priority}
              sizes="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 46vw"
              className="object-cover transition-[transform,opacity] duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.035]"
            />
            {product.hoverImage && (
              <Image
                src={product.hoverImage.url}
                alt=""
                fill
                sizes="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 46vw"
                className="object-cover opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="grid h-full place-items-center text-sm text-subtle">Photo coming soon</div>
        )}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur",
              product.purchaseMode === "QUOTE" ? "bg-ink/80 text-white" : "bg-white/90 text-ink",
            )}
          >
            {modeLabel}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col px-0.5">
        <p className="font-mono text-[11px] uppercase tracking-wider text-subtle">{product.category.name}</p>
        <h3 className="mt-1 text-[15px] font-semibold leading-snug text-fg transition-colors group-hover:text-accent sm:text-base">
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          <p className="text-[15px] text-fg">
            {product.fromCents != null ? (
              <>
                <span className="text-subtle">From </span>
                <span className="font-semibold">{formatMoney(product.fromCents, product.currency)}</span>
                <span className="text-subtle"> / unit</span>
              </>
            ) : (
              <span className="font-semibold">Price on request</span>
            )}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" aria-hidden /> MOQ {product.moq}
            </span>
            {lead && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden /> {lead}
              </span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
