"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/** Accessible tabs (Description · Specifications · Trade & packaging). Panels are server-rendered children. */
export function ProductTabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  return (
    <div>
      <div role="tablist" aria-label="Product information" className="scrollbar-none flex gap-6 overflow-x-auto border-b hairline">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`${base}-${t.id}-tab`}
            aria-selected={active === t.id}
            aria-controls={`${base}-${t.id}`}
            onClick={() => setActive(t.id)}
            className={cn(
              "label relative h-12 shrink-0 text-[0.7rem] transition-colors",
              active === t.id ? "text-fg after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-accent" : "text-subtle hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${base}-${t.id}`} aria-labelledby={`${base}-${t.id}-tab`} hidden={active !== t.id} className="pt-8">
          {t.content}
        </div>
      ))}
    </div>
  );
}
