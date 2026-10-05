"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, MessageCircle, Sparkles } from "lucide-react";
import { openAssistant } from "@/components/assistant/bus";

/**
 * Thumb-zone action bar for phones. Three jobs only: quote, talk, ask.
 * Product, cart and checkout pages render their own context-specific bar,
 * so this one steps aside there.
 */
export function MobileActionBar({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();
  const hidden = /^\/(products\/(?!c\/)[^/]+|cart|checkout|order|quote|design-studio)/.test(pathname);
  if (hidden) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-paper/95 px-3 pt-2 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-2">
        <Link
          href="/quote"
          className="flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-[15px] font-semibold text-accent-ink"
          data-track="cta_click"
          data-track-label="Mobile bar: Get a quote"
        >
          <FileText className="h-[18px] w-[18px]" aria-hidden /> Get a quote
        </Link>
        {whatsapp ? (
          <a
            href={`https://wa.me/${whatsapp}`}
            className="flex h-12 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-[#1fae4b] text-[15px] font-semibold text-white"
            data-track="whatsapp_click"
            data-track-label="Mobile bar WhatsApp"
          >
            <MessageCircle className="h-[18px] w-[18px]" aria-hidden /> Chat
          </a>
        ) : (
          <Link
            href="/contact"
            className="flex h-12 items-center justify-center rounded-[var(--radius-control)] border border-white/12 text-[15px] font-semibold text-fg"
            data-track="cta_click"
            data-track-label="Mobile bar: Contact"
          >
            Contact
          </Link>
        )}
        <button
          type="button"
          onClick={() => openAssistant()}
          className="flex h-12 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-white text-[15px] font-semibold text-ink"
        >
          <Sparkles className="h-[18px] w-[18px]" aria-hidden /> Ask AI
        </button>
      </div>
    </div>
  );
}
