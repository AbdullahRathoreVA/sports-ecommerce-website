"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import { openAssistant } from "./bus";
import { cn } from "@/lib/utils";

export function AskChips({ questions, tone = "dark" }: { questions: string[]; tone?: "dark" | "light" }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {questions.map((q) => (
        <li key={q}>
          <button
            type="button"
            onClick={() => openAssistant({ question: q })}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-left text-sm transition-colors",
              tone === "dark"
                ? "border-white/15 bg-white/[0.04] text-white/85 hover:border-cobalt-300 hover:text-white"
                : "border-white/12 bg-surface text-fg hover:border-accent hover:text-accent",
            )}
          >
            {q} <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AskButton({ label, question, className }: { label: string; question?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => openAssistant({ question })}
      className={cn(
        "inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-white px-5 text-[15px] font-semibold text-ink transition-colors hover:bg-white/90",
        className,
      )}
    >
      <Sparkles className="h-4 w-4 text-accent" aria-hidden /> {label}
    </button>
  );
}
