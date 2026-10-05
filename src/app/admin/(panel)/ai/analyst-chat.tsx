"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Loader2, RotateCcw } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { RANGE_OPTIONS } from "@/lib/admin/range";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; engine?: string };

const STARTERS = [
  "How is the business doing this period?",
  "Which products should we push, and which are leaking interest?",
  "Which countries are worth targeting?",
  "Do mobile visitors convert worse than desktop?",
  "Which leads need follow-up first?",
  "Where do people drop out of the funnel?",
];

export function AnalystChat({ aiConfigured }: { aiConfigured: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [range, setRange] = useState("30d");
  const [includeDemo, setIncludeDemo] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView.
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })), range, includeDemo, conversationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The analyst couldn't answer");
      setConversationId(data.conversationId);
      setMessages([...next, { role: "assistant", content: data.reply, engine: data.engine }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages(messages);
      setInput(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-220px)] flex-col rounded-[var(--radius-card)] border hairline bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b hairline p-3">
        <div className="flex flex-wrap gap-1 rounded-xl border hairline p-1" role="group" aria-label="Period">
          {RANGE_OPTIONS.map((o) => (
            <button key={o.key} type="button" aria-pressed={range === o.key} onClick={() => setRange(o.key)} className={cn("h-8 rounded-lg px-2.5 text-xs font-medium", range === o.key ? "bg-white text-ink" : "text-muted hover:text-fg")}>
              {o.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" /> Include demo data
        </label>
        {messages.length > 0 && (
          <button type="button" onClick={() => { setMessages([]); setConversationId(undefined); }} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted hover:text-fg">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> New chat
          </button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-xl py-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/10"><Bot className="h-6 w-6 text-accent" aria-hidden /></span>
            <h2 className="mt-4 text-lg font-semibold">Ask about your sales, products and visitors</h2>
            <p className="mt-1.5 text-sm text-muted">
              Answers come only from your dashboard numbers for the chosen period — no customer names or contact details are shared with the AI.
              {!aiConfigured && " No AI key is set, so the built-in analyst answers from the same numbers."}
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => void ask(s)} className="rounded-xl border hairline p-3 text-left text-sm text-muted hover:border-accent hover:text-fg">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-[15px] text-ink">{m.content}</div>
            ) : (
              <div key={i} className="flex max-w-[92%] gap-3">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent/10"><Bot className="h-4 w-4 text-accent" aria-hidden /></span>
                <div className="min-w-0">
                  <Markdown source={m.content} compact dark className="text-[15px]" />
                  {m.engine && <p className="mt-1.5 text-[11px] text-subtle">{m.engine === "grounded" ? "Built-in analyst" : m.engine.replace(/^llm:/, "")}</p>}
                </div>
              </div>
            ),
          )
        )}
        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading the numbers…
          </p>
        )}
        <div ref={end} />
      </div>

      <form
        className="border-t hairline p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
      >
        {error && <p className="mb-2 text-sm text-red-300" role="alert">{error}</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="analyst-q" className="sr-only">Ask the analyst</label>
          <textarea
            id="analyst-q"
            rows={1}
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(input);
              }
            }}
            placeholder="e.g. Why are racing suits getting views but no quotes?"
            className="max-h-40 min-h-12 flex-1 resize-none rounded-[var(--radius-control)] border border-white/12 bg-ink-2 px-3.5 py-3 text-[16px] outline-none focus:border-accent"
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Ask" className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-control)] bg-accent text-accent-ink disabled:opacity-40">
            <ArrowUp className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
