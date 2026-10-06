"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Menu, MessageCircle, Search, ShoppingBag, X, Mail } from "lucide-react";
import { useCart } from "@/components/cart/cart-context";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/config/site";

type Cat = { slug: string; name: string; tagline: string | null; image: string | null; count: number };

const navItem =
  "relative flex h-10 items-center gap-1 rounded-md px-3 text-[14px] font-medium text-white/70 transition-colors hover:text-white aria-[current=page]:text-white after:absolute after:inset-x-3 after:-bottom-px after:h-[2px] after:scale-x-0 after:bg-accent after:transition-transform aria-[current=page]:after:scale-x-100";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Link href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={navItem} data-track="nav_click">
      {children}
    </Link>
  );
}

/** Simple hover/click dropdown for the "Company" menu. */
export function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setOpen(false), [pathname]);
  const active = items.some((i) => isActive(pathname, i.href));
  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (timer.current) clearTimeout(timer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        timer.current = setTimeout(() => setOpen(false), 120);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className={navItem}
      >
        {label} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <div hidden={!open} className="absolute left-1/2 top-full z-50 mt-3 w-72 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-2 p-2 shadow-2xl shadow-black/40">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="block rounded-md px-3 py-2.5 transition-colors hover:bg-white/[0.06]" data-track="nav_click">
            <span className="block text-sm font-semibold text-white">{i.label}</span>
            {i.description && <span className="mt-0.5 block text-xs text-white/55">{i.description}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ProductsMenu({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => setOpen(false), [pathname]);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(true);
  };
  const hide = () => {
    timer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="products-menu"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-current={pathname.startsWith("/products") ? "page" : undefined}
        className={navItem}
      >
        Products <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <div
        id="products-menu"
        hidden={!open}
        className="absolute left-1/2 top-full z-50 mt-3 w-[min(880px,calc(100vw-80px))] -translate-x-1/2 rounded-lg border border-white/10 bg-ink-2 p-3 shadow-2xl shadow-black/50"
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      >
        <div className="grid grid-cols-3 gap-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/products/c/${c.slug}`}
              className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.06]"
              data-track="nav_click"
              data-category={c.slug}
            >
              <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {c.image && <Image src={c.image} alt="" fill sizes="56px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{c.name}</span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-white/55">{c.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3">
          <p className="text-sm text-white/70">Need something not listed? We manufacture to your spec.</p>
          <Link href="/products" className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-white" data-track="nav_click">
            All products <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HeaderActions() {
  const { count, ready } = useCart();
  return (
    <>
      <Link
        href="/products?focus=search"
        aria-label="Search products"
        className="grid h-10 w-10 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
      >
        <Search className="h-5 w-5" aria-hidden />
      </Link>
      <Link
        href="/cart"
        aria-label={`Cart${ready && count ? `, ${count} items` : ""}`}
        className="relative grid h-10 w-10 place-items-center rounded-md text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
      >
        <ShoppingBag className="h-5 w-5" aria-hidden />
        {ready && count > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-medium text-accent-ink">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </>
  );
}

export function MobileMenu({
  categories,
  nav,
  brandName,
  whatsapp,
  email,
}: {
  categories: Cat[];
  nav: NavItem[];
  brandName: string;
  whatsapp: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-md text-white transition-colors hover:bg-white/[0.07] lg:hidden"
      >
        <Menu className="h-6 w-6" aria-hidden />
      </button>
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label={`${brandName} menu`}
          className="on-dark fixed inset-0 z-[60] flex flex-col bg-ink text-white animate-fade lg:hidden"
        >
          <div className="container-x flex h-[var(--header-h)] items-center justify-between border-b border-white/10">
            <span className="text-lg font-semibold tracking-tight">{brandName}</span>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/[0.07]"
            >
              <X className="h-6 w-6" aria-hidden />
            </button>
          </div>
          <div className="container-x flex-1 overflow-y-auto py-6">
            <p className="eyebrow text-white/45">Products</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/products/c/${c.slug}`}
                    className="relative flex h-24 items-end overflow-hidden rounded-xl bg-ink-3 p-3"
                    data-track="nav_click"
                    data-category={c.slug}
                  >
                    {c.image && <Image src={c.image} alt="" fill sizes="45vw" className="object-cover opacity-55" />}
                    <span className="relative text-sm font-semibold leading-tight">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/products" className="mt-3 flex h-12 items-center justify-between rounded-xl border border-white/15 px-4 text-sm font-semibold">
              All products <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>

            <nav aria-label="Mobile" className="mt-8">
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {nav.filter((item) => item.href !== "/products").map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="flex h-14 items-center justify-between text-lg font-semibold" data-track="nav_click">
                      {item.label}
                      <ArrowRight className="h-4 w-4 text-white/40" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="container-x grid grid-cols-2 gap-2 border-t border-white/10 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link href="/quote" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] bg-accent text-[15px] font-semibold text-accent-ink" data-track="cta_click" data-track-label="Menu: Get a quote">
              Request Quote
            </Link>
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#1fae4b] text-[15px] font-semibold"
                data-track="whatsapp_click"
                data-track-label="Menu WhatsApp"
              >
                <MessageCircle className="h-5 w-5" aria-hidden /> WhatsApp
              </a>
            ) : email ? (
              <a href={`mailto:${email}`} className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/20 text-[15px] font-semibold" data-track="email_click">
                <Mail className="h-5 w-5" aria-hidden /> Email us
              </a>
            ) : (
              <Link href="/contact" className="flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-white/20 text-[15px] font-semibold">
                Contact
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
