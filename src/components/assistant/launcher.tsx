"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, FileText, Mail, MessageCircle, MessagesSquare, Sparkles, X } from "lucide-react";
import { onAssistantOpen, type AssistantOpenDetail } from "./bus";
import { track } from "@/lib/analytics/client";

// The panel (chat UI + markdown + forms) is only downloaded on first open.
const AssistantPanel = dynamic(() => import("./panel").then((m) => m.AssistantPanel), { ssr: false });

/**
 * Floating dock (bottom-right on desktop, bottom bar on phones): "Get a quote"
 * and "Chat". Chat opens a chooser — the AI assistant (instant, any time),
 * WhatsApp and email — so every way to reach the team is one tap away.
 */
export function AssistantLauncher({ brandName, whatsapp = "", email = "" }: { brandName: string; whatsapp?: string; email?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [chooser, setChooser] = useState(false);
  const [initial, setInitial] = useState<AssistantOpenDetail>({});
  const pathname = usePathname();
  // Product, cart, checkout and quote pages have their own sticky action bar on phones.
  const hideOnMobile = /^\/(products\/(?!c\/)[^/]+|cart|checkout|order|quote|design-studio)/.test(pathname);

  useEffect(
    () =>
      onAssistantOpen((detail) => {
        setInitial({ ...detail });
        setMounted(true);
        setChooser(false);
        setOpen(true);
      }),
    [],
  );

  useEffect(() => {
    if (!chooser) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setChooser(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chooser]);

  const openAi = () => {
    setInitial({});
    setMounted(true);
    setChooser(false);
    setOpen(true);
  };

  const options = [
    { key: "ai", icon: Sparkles, title: "AI assistant", sub: "Instant answers about products, MOQ and sizes — any time", onClick: openAi, live: true },
    whatsapp && { key: "wa", icon: MessageCircle, title: "WhatsApp", sub: "Chat with our sales team", href: `https://wa.me/${whatsapp}`, track: "whatsapp_click" },
    email && { key: "email", icon: Mail, title: "Email our team", sub: email, href: `mailto:${email}`, track: "email_click" },
    { key: "form", icon: FileText, title: "Request a quote", sub: "Send your requirements in two steps", href: "/quote", track: "quote_start" },
  ].filter(Boolean) as { key: string; icon: typeof Mail; title: string; sub: string; href?: string; onClick?: () => void; track?: string; live?: boolean }[];

  return (
    <>
      <div
        className={`on-dark fixed inset-x-2 bottom-2 z-40 flex gap-1.5 rounded-xl border border-white/10 bg-ink/95 p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur lg:inset-x-auto lg:bottom-6 lg:right-6 ${hideOnMobile ? "hidden lg:flex" : "flex"}`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link
          href="/quote"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover lg:flex-none"
          data-track="cta_click"
          data-track-label="Dock: Get a quote"
        >
          <FileText className="h-4 w-4" aria-hidden /> Get a quote <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => {
            setChooser(true);
            track("cta_click", { label: "Dock: Chat" });
          }}
          aria-haspopup="dialog"
          className="relative flex h-11 flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white hover:bg-white/[0.07] lg:flex-none"
        >
          <MessagesSquare className="h-4 w-4" aria-hidden /> Chat
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-signal animate-pulse-dot" aria-hidden />
        </button>
      </div>

      {chooser && (
        <div className="fixed inset-0 z-[70] grid place-items-end bg-black/50 p-3 animate-fade sm:place-items-center" role="dialog" aria-modal="true" aria-labelledby="chooser-title" onClick={() => setChooser(false)}>
          <div className="w-full max-w-md rounded-xl bg-paper p-6 text-fg shadow-2xl animate-rise" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="label text-accent">{brandName}</p>
                <h2 id="chooser-title" className="mt-2 text-2xl font-semibold tracking-tight">
                  Let&apos;s talk sportswear.
                </h2>
                <p className="mt-1 text-sm text-muted">Choose the best way to reach us.</p>
              </div>
              <button type="button" onClick={() => setChooser(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-md border hairline hover:bg-fg/5">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ul className="mt-5 space-y-2">
              {options.map((o) => {
                const inner = (
                  <>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fg/5">
                      <o.icon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[15px] font-semibold">
                        {o.title}
                        {o.live && <span className="label rounded-sm bg-signal/15 px-1.5 py-0.5 text-[0.55rem] text-emerald-700">Online</span>}
                      </span>
                      <span className="block truncate text-xs text-muted">{o.sub}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden />
                  </>
                );
                const cls = "flex w-full items-center gap-3 rounded-lg border hairline bg-surface p-3 text-left transition-colors hover:border-fg/40";
                return (
                  <li key={o.key}>
                    {o.onClick ? (
                      <button type="button" onClick={o.onClick} className={cls}>
                        {inner}
                      </button>
                    ) : (
                      <a href={o.href} className={cls} data-track={o.track} data-track-label="Chat chooser" onClick={() => setChooser(false)}>
                        {inner}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {mounted && <AssistantPanel open={open} onClose={() => setOpen(false)} initial={initial} brandName={brandName} />}
    </>
  );
}
