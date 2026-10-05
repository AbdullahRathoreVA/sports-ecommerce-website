"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";

/** Re-renders the server page on an interval while the tab is visible. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [at, setAt] = useState(() => new Date());
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setAt(new Date());
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [on, seconds, router]);
  return (
    <button type="button" onClick={() => setOn(!on)} className="inline-flex h-9 items-center gap-2 rounded-full border hairline px-3 text-xs font-medium text-muted hover:text-fg" aria-pressed={on}>
      {on ? (
        <>
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Live · updated {at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          <Pause className="h-3.5 w-3.5" aria-hidden />
        </>
      ) : (
        <>
          Paused <Play className="h-3.5 w-3.5" aria-hidden />
        </>
      )}
    </button>
  );
}
