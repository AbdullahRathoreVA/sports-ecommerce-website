import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "dark" | "light" | "outline" | "outline-light" | "ghost" | "whatsapp";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] font-semibold tracking-tight transition-[background-color,color,border-color,transform,box-shadow] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-hover shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_10px_30px_-12px_rgba(205,245,74,0.55)]",
  dark: "border border-white/10 bg-surface-2 text-fg hover:bg-ink-4",
  light: "bg-white text-ink hover:bg-white/90",
  outline: "border border-white/15 bg-transparent text-fg hover:border-white/35 hover:bg-white/[0.04]",
  "outline-light": "border border-white/25 bg-transparent text-white hover:border-white/60 hover:bg-white/[0.06]",
  ghost: "bg-transparent text-fg hover:bg-white/[0.06]",
  whatsapp: "bg-[#1fae4b] text-white hover:bg-[#178f3d]",
};

// Every size meets the 44px minimum touch target on mobile.
const sizes: Record<Size, string> = {
  sm: "h-11 px-4 text-sm sm:h-10",
  md: "h-12 px-5 text-[15px]",
  lg: "h-14 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type CommonProps = { variant?: Variant; size?: Size; className?: string; children: React.ReactNode };

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...rest
}: CommonProps & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const external = /^(https?:|mailto:|tel:)/.test(href);
  if (external) {
    return (
      <a href={href} className={buttonClass(variant, size, className)} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant,
  size,
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
