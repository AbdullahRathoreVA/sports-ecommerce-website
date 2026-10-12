"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { afterSettled } from "@/lib/device";

/**
 * Phones only fetch a lazy image once it is about to scroll in, so on a quick
 * scroll pictures arrived visibly late. Once the page has settled, this fetches
 * the remaining lazy images in the background, a few at a time and in page
 * order — so by the time the visitor gets there they are already decoded.
 * Skipped on Save-Data and 2G connections.
 */
export function ImageWarmup() {
  const pathname = usePathname();
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? "")) return;
    let stopped = false;
    const cancel = afterSettled(async () => {
      const queue = Array.from(document.querySelectorAll<HTMLImageElement>('main img[loading="lazy"]'));
      const BATCH = 3;
      for (let i = 0; i < queue.length && !stopped; i += BATCH) {
        await Promise.all(
          queue.slice(i, i + BATCH).map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete && img.naturalWidth > 0) return resolve();
                img.addEventListener("load", () => resolve(), { once: true });
                img.addEventListener("error", () => resolve(), { once: true });
                img.loading = "eager";
                // Never wait forever on one slow image.
                setTimeout(resolve, 4000);
              }),
          ),
        );
      }
    }, 1800);
    return () => {
      stopped = true;
      cancel();
    };
  }, [pathname]);
  return null;
}
