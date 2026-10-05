import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/catalog";
import { primaryNav } from "@/config/site";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { HeaderActions, MobileMenu, ProductsMenu } from "./header-client";

export async function Header() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const cats = categories.map((c) => ({ slug: c.slug, name: c.name, tagline: c.tagline, image: c.image, count: c.productCount }));

  return (
    <header className="on-dark sticky top-0 z-50 border-b border-white/10 bg-ink text-white">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 text-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <div className="container-x flex h-[var(--header-h)] items-center gap-4">
        <Link href="/" aria-label={`${settings.brand.name} home`} className="shrink-0" data-track="nav_click" data-track-label="Logo">
          <Logo name={settings.brand.name} />
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden flex-1 items-center gap-1 lg:flex">
          <ProductsMenu categories={cats} />
          {primaryNav.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[14px] font-medium text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white"
              data-track="nav_click"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 lg:ml-0">
          <HeaderActions />
          <ButtonLink
            href="/quote"
            size="sm"
            className="hidden sm:inline-flex"
            data-track="cta_click"
            data-track-label="Header: Get a quote"
          >
            Get a quote
          </ButtonLink>
          <MobileMenu
            categories={cats}
            nav={primaryNav}
            brandName={settings.brand.name}
            whatsapp={settings.contact.whatsapp}
            email={settings.contact.email}
          />
        </div>
      </div>
    </header>
  );
}
