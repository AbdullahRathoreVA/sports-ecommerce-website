"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { onAssistantOpen, type AssistantOpenDetail } from "./bus";

// The panel (chat UI + markdown + forms) is only downloaded on first open.
const AssistantPanel = dynamic(() => import("./panel").then((m) => m.AssistantPanel), { ssr: false });

export function AssistantLauncher({ brandName }: { brandName: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initial, setInitial] = useState<AssistantOpenDetail>({});

  useEffect(
    () =>
      onAssistantOpen((detail) => {
        setInitial({ ...detail });
        setMounted(true);
        setOpen(true);
      }),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setInitial({});
          setMounted(true);
          setOpen(true);
        }}
        aria-label="Ask the product assistant"
        className="group fixed bottom-6 right-6 z-40 hidden h-14 items-center gap-2.5 rounded-full bg-white pl-4 pr-5 text-[15px] font-semibold text-ink shadow-[0_18px_40px_-12px_rgba(11,12,14,0.55)] ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 lg:flex"
      >
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink">
          <Sparkles className="h-4 w-4" aria-hidden />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-surface-2 animate-pulse-dot" />
        </span>
        Ask about products
      </button>
      {mounted && <AssistantPanel open={open} onClose={() => setOpen(false)} initial={initial} brandName={brandName} />}
    </>
  );
}
