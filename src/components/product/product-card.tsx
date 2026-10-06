import Link from "next/link";
import Image from "next/image";
import { Clock, Package, Ruler } from "lucide-react";
import type { ProductCard as Card } from "@/lib/catalog";
import { formatMoney, leadTimeLabel, cn } from "@/lib/utils";

/**
 * Trade catalogue card: SKU, name, price per piece (or "Price on request"),
 * MOQ and lead time are visible without a click — the facts a B2B buyer
 * qualifies a supplier on. The second image swaps in on hover.
 */
export function ProductCard({ product, priority = false, className }: { product: Card & { sizes?: string[] }; priority?: boolean; className?: string }) {
  const lead = leadTimeLabel(product.leadTimeMinDays, product.leadTimeMaxDays);
  const badges = [
    product.featured && { label: "Featured", tone: "bg-accent text-accent-ink" },
    product.purchaseMode !== "QUOTE" && { label: product.purchaseMode === "CART" ? "Buy online" : "Sample available", tone: "bg-ink text-white" },
  ].filter(Boolean) as { label: string; tone: string }[];

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn("group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border hairline bg-surface transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]", className)}
      data-track="product_click"
      data-product-id={product.id}
      data-category={product.category.slug}
      data-track-label={product.name}
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
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
        {badges.length > 0 && (
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {badges.map((b, i) => (
              <span key={b.label} className={cn("label rounded-sm px-2 py-1 text-[0.58rem]", b.tone, i > 0 && "hidden sm:inline")}>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10.5px] uppercase tracking-wide text-subtle">{product.sku}</span>
          <span className="hidden rounded-sm border hairline px-1.5 py-0.5 text-[10.5px] font-medium text-muted sm:inline">Alrobel</span>
        </p>
        <h3 className="mt-1.5 text-[14px] font-semibold leading-snug text-fg transition-colors group-hover:text-accent sm:text-[15px]">{product.name}</h3>
        {product.subtitle && <p className="label mt-1 line-clamp-1 text-[0.6rem] text-subtle">{product.subtitle}</p>}
        <p className="mt-3 text-[15px]">
          {product.fromCents != null ? (
            <>
              <span className="text-[11px] text-subtle">FROM </span>
              <span className="font-semibold">{formatMoney(product.fromCents, product.currency)}</span>
              <span className="text-[12px] text-subtle"> / piece</span>
            </>
          ) : (
            <span className="font-semibold text-accent">Price on request</span>
          )}
        </p>
        <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t hairline pt-3 text-[11.5px] text-muted [margin-top:max(0.75rem,auto)]">
          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5 text-accent" aria-hidden /> MOQ {product.moq}
          </span>
          {lead && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-accent" aria-hidden /> {lead}
            </span>
          )}
          {product.sizes && product.sizes.length > 1 && (
            <span className="hidden items-center gap-1 sm:inline-flex">
              <Ruler className="h-3.5 w-3.5 text-accent" aria-hidden /> {product.sizes.length} sizes
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
