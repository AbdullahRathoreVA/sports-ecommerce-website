"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { askHelp, type HelpAnswer } from "./actions";
import { inputClass } from "@/components/forms/field";
import { cn } from "@/lib/utils";

const EXAMPLES = ["How do I add a new category?", "Lead finder kaise use karun?", "How do I publish a review?", "Customer ka order kaise update karun?"];

export function HelpAsk({ topics }: { topics: { id: string; title: string }[] }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<HelpAnswer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ask = (question: string) => {
    setErr(null);
    start(async () => {
      const r = await askHelp(question);
      if (r.ok) setAnswer(r.data);
      else setErr(r.error);
    });
  };
  const openTopic = (id: string) => {
    const el = document.getElementById(`help-${id}`);
    el?.querySelector("details")?.setAttribute("open", "");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <section className="rounded-[var(--radius-card)] border border-accent/30 bg-surface p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Ask anything about the admin
      </h2>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) ask(q);
        }}
      >
        <label htmlFor="help-q" className="sr-only">Your question</label>
        <input id="help-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. How do I add a lead from WhatsApp?" className={cn(inputClass, "flex-1")} />
        <button type="submit" disabled={pending || !q.trim()} className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-6 font-semibold text-accent-ink disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Ask
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => {
              setQ(x);
              ask(x);
            }}
            className="rounded-full border hairline px-3 py-1 text-xs text-muted hover:text-fg"
          >
            {x}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      {answer && (
        <div className="mt-4 space-y-3">
          {answer.answer ? (
            <div className="whitespace-pre-wrap rounded-xl bg-white/[0.04] p-4 text-[15px] leading-relaxed">{answer.answer}</div>
          ) : (
            <p className="text-sm text-muted">The guide doesn&apos;t cover that yet. Try different words, or browse the sections below.</p>
          )}
          <p className="text-[11px] text-subtle">
            {answer.answeredBy === "ai" ? "Written by AI from this guide only — check important steps." : answer.answeredBy === "guide" ? "From the guide." : ""}
          </p>
          {answer.topics.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {answer.topics.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => openTopic(t.id)} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20">
                    {topics.find((x) => x.id === t.id)?.title ?? t.title} →
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
