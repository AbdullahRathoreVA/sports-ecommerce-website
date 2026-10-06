import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/catalog";
import { companyNav, primaryNav } from "@/config/site";
import { Logo } from "@/components/ui/logo";
import { HeaderActions, MobileMenu, NavDropdown, NavLink, ProductsMenu } from "./header-client";

/** Floating dark bar, as in the reference layout: logo · nav · quote action. */
export async function Header() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name, tagline: c.tagline, image: c.image, count: c.productCount }));

  return (
    <header className="sticky top-0 z-50 px-2 pt-2 sm:px-3 sm:pt-3">
      <a href="#main" className="sr-only z-50 rounded-md bg-white px-4 py-2 text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-3">
        Skip to content
      </a>
      <div className="on-dark mx-auto flex h-[calc(var(--header-h)-12px)] max-w-[1400px] items-center gap-3 rounded-xl border border-white/10 bg-ink/95 px-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur sm:px-4">
        <Link href="/" aria-label={`${settings.brand.name} home`} className="shrink-0 text-white" data-track="nav_click" data-track-label="Logo">
          <Logo name={settings.brand.name} />
        </Link>

        <nav aria-label="Primary" className="mx-auto hidden items-center gap-0.5 lg:flex">
          <NavLink href="/">Home</NavLink>
          <ProductsMenu categories={cats} />
          {primaryNav.slice(1, 3).map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
          <NavDropdown label="Company" items={companyNav} />
          <NavLink href="/contact">Contact</NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <HeaderActions />
          <Link
            href="/quote"
            className="hidden h-10 items-center gap-1.5 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover sm:inline-flex"
            data-track="cta_click"
            data-track-label="Header: Request quote"
          >
            Request Quote <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          <MobileMenu
            categories={cats}
            nav={[{ label: "Home", href: "/" }, ...primaryNav, ...companyNav]}
            brandName={settings.brand.name}
            whatsapp={settings.contact.whatsapp}
            email={settings.contact.email}
          />
        </div>
      </div>
    </header>
  );
}
