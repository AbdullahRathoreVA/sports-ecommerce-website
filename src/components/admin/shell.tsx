"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  ClipboardList,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ScrollText,
  ShieldCheck,
  ShoppingCart,
  Users,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

export type NavKey = "overview" | "live" | "analytics" | "orders" | "leads" | "customers" | "products" | "content" | "ai" | "audit" | "users";

const NAV: { key: NavKey; label: string; href: string; icon: typeof Activity }[] = [
  { key: "overview", label: "Overview", href: "/admin", icon: LayoutDashboard },
  { key: "live", label: "Live", href: "/admin/live", icon: Activity },
  { key: "analytics", label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { key: "orders", label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { key: "leads", label: "Leads & quotes", href: "/admin/leads", icon: ClipboardList },
  { key: "customers", label: "Customers", href: "/admin/customers", icon: Users },
  { key: "products", label: "Products", href: "/admin/products", icon: Package },
  { key: "content", label: "Content & settings", href: "/admin/content", icon: FileText },
  { key: "ai", label: "AI analyst", href: "/admin/ai", icon: Bot },
  { key: "audit", label: "Audit log", href: "/admin/audit", icon: ScrollText },
  { key: "users", label: "Admin users", href: "/admin/users", icon: ShieldCheck },
];

export function AdminShell({
  allowed,
  admin,
  brand,
  badges,
  children,
}: {
  allowed: NavKey[];
  admin: { name: string; email: string; role: string };
  brand: string;
  badges: Partial<Record<NavKey, number>>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const items = NAV.filter((n) => allowed.includes(n.key));

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-0.5">
      {items.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors",
            isActive(href) ? "bg-white/[0.08] text-white" : "text-muted hover:bg-white/[0.04] hover:text-fg",
          )}
        >
          <Icon className={cn("h-[18px] w-[18px]", isActive(href) ? "text-accent" : "")} aria-hidden />
          <span className="flex-1">{label}</span>
          {badges[key] ? (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-[10.5px] font-semibold text-accent-ink">{badges[key]}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t hairline pt-4">
      <Link href="/admin/account" className="block rounded-lg hover:text-accent">
        <p className="truncate text-sm font-semibold">{admin.name}</p>
        <p className="truncate text-xs text-subtle">
          {admin.email} · {admin.role.toLowerCase()}
        </p>
      </Link>
      <div className="mt-3 flex gap-2">
        <a href="/" target="_blank" rel="noopener" className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border hairline text-xs font-semibold text-muted hover:text-fg">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden /> View site
        </a>
        <button type="button" onClick={logout} className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border hairline text-xs font-semibold text-muted hover:text-fg">
          <LogOut className="h-3.5 w-3.5" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-r hairline bg-ink-2 p-4 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 pt-1">
          <LogoMark />
          <span>
            <span className="block font-display text-lg leading-none">{brand}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-subtle">Control centre</span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b hairline bg-ink-2/95 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-lg">{brand}</span>
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin menu" aria-expanded={open} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/[0.06]">
          <Menu className="h-6 w-6" aria-hidden />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col gap-5 bg-ink-2 p-4 animate-fade">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg">{brand}</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/[0.06]">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {footer}
          </div>
        </div>
      )}
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
