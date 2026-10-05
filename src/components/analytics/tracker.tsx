"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { flushNow, track } from "@/lib/analytics/client";
import { isEventName } from "@/lib/analytics/events";

/**
 * Mounts once in the public layout:
 *  - a page_view on every client-side navigation
 *  - one delegated click listener for any element with `data-track`, so
 *    server-rendered links can be tracked without becoming client components
 *  - a visible-tab heartbeat that keeps "live visitors" accurate
 */
export function Tracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      const name = el.dataset.track ?? "";
      if (!isEventName(name)) return;
      track(name, {
        label: el.dataset.trackLabel ?? el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 80) ?? undefined,
        productId: el.dataset.productId,
        category: el.dataset.category,
      });
      // Outbound links (WhatsApp, mail, tel) navigate away immediately.
      if (el instanceof HTMLAnchorElement && /^(https?:\/\/wa\.me|mailto:|tel:)/.test(el.href)) flushNow();
    }
    document.addEventListener("click", onClick, { capture: true });

    const beat = setInterval(() => {
      if (document.visibilityState === "visible") track("heartbeat");
    }, 60_000);

    const onHide = () => {
      if (document.visibilityState === "hidden") flushNow();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(beat);
    };
  }, []);

  return null;
}
