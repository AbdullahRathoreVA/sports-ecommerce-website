"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, CheckCircle2, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { sessionId, track } from "@/lib/analytics/client";
import { formatMoney, cn } from "@/lib/utils";
import type { AssistantOpenDetail } from "./bus";

type ProductMini = { slug: string; name: string; image: string | null; fromCents: number | null; currency: string; moq: number; category: string };
type Turn =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      products?: ProductMini[];
      suggestions?: string[];
      capture?: { reason: string; prefill: { productSlug?: string; quantity?: number; summary?: string } } | null;
      engine?: string;
    };

const STORE = "gl_assistant_v1";

const STARTERS = [
  "What can you make for my football club?",
  "What's the MOQ for race suits?",
  "Can I get a sample first?",
  "Which gloves for American football?",
];

export function AssistantPanel({
  open,
  onClose,
  initial,
  brandName,
}: {
  open: boolean;
  onClose: () => void;
  initial: AssistantOpenDetail;
  brandName: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureFor, setCaptureFor] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);
  const handledInitial = useRef<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE);
      // Drop malformed turns (e.g. saved by an older version) instead of crashing on them.
      if (saved) setTurns((JSON.parse(saved) as Turn[]).filter((t) => t && typeof t.content === "string" && (t.role === "user" || t.role === "assistant")));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-30)));
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, 1200);
      if (!content || busy) return;
      setError(null);
      if (!started.current) {
        started.current = true;
        track("ai_chat_start");
      }
      track("ai_message");
      const next: Turn[] = [...turns, { role: "user", content }];
      setTurns(next);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: next.slice(-12).map((t) => ({ role: t.role, content: t.content })),
            productSlug: initial.productSlug,
            sessionId: sessionId(),
          }),
        });
        if (res.status === 429) throw new Error("You're sending messages quickly — please wait a moment and try again.");
        if (!res.ok) throw new Error("The assistant is unavailable right now. Our team can still help — use the quote form or WhatsApp.");
        // The API answers with `reply`; turns store it as `content`.
        const data = (await res.json()) as Omit<Extract<Turn, { role: "assistant" }>, "role" | "content"> & { reply?: string };
        const { reply, ...rest } = data;
        if (typeof reply !== "string" || !reply.trim()) throw new Error("The assistant is unavailable right now. Our team can still help — use the quote form or WhatsApp.");
        setTurns((prev) => [...prev, { ...rest, role: "assistant", content: reply }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [busy, turns, initial.productSlug],
  );

  // Prefilled question from a chip or product page.
  useEffect(() => {
    if (!open || !initial.question) return;
    const key = initial.question + (initial.productSlug ?? "");
    if (handledInitial.current === key) return;
    handledInitial.current = key;
    void send(initial.question);
  }, [open, initial, send]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[65] lg:inset-auto lg:bottom-6 lg:right-6" role="dialog" aria-modal="true" aria-label="Product assistant">
      <div className="absolute inset-0 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 top-[6svh] flex flex-col overflow-hidden rounded-t-[22px] bg-paper shadow-2xl animate-rise lg:static lg:h-[min(700px,calc(100svh-48px))] lg:w-[420px] lg:rounded-[22px] lg:ring-1 lg:ring-white/10">
        <header className="on-dark flex items-center gap-3 bg-ink px-4 py-3.5 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight">{brandName} assistant</p>
            <p className="flex items-center gap-1 text-xs text-white/60">
              <ShieldCheck className="h-3.5 w-3.5 text-signal" aria-hidden /> Answers from our real catalogue
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close assistant" className="grid h-11 w-11 place-items-center rounded-xl hover:bg-white/10">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
          {turns.length === 0 && (
            <div>
              <p className="text-[15px] leading-relaxed text-muted">
                Hi — ask me about products, materials, minimum quantities, sizing or customisation. If you&apos;re ready, I can also
                pass your requirements straight to our sales team.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => send(s)}
                      className="w-full rounded-xl border hairline bg-surface px-4 py-3 text-left text-sm font-medium text-fg transition-colors hover:border-accent hover:text-accent"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {turns.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15px] font-medium leading-relaxed text-accent-ink">{t.content}</p>
              </div>
            ) : (
              <div key={i} className="space-y-3">
                <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-[15px] ring-1 ring-white/[0.07]">
                  <Markdown source={t.content} compact />
                </div>
                {t.products && t.products.length > 0 && (
                  <ul className="scrollbar-none -mx-4 flex gap-2.5 overflow-x-auto px-4">
                    {t.products.map((p) => (
                      <li key={p.slug} className="w-[150px] shrink-0">
                        <Link href={`/products/${p.slug}`} onClick={onClose} className="block overflow-hidden rounded-xl bg-surface ring-1 ring-white/[0.07] transition hover:ring-accent">
                          <span className="relative block aspect-[4/5] bg-surface-2">
                            {p.image && <Image src={p.image} alt="" fill sizes="150px" className="object-cover" />}
                          </span>
                          <span className="block p-2.5">
                            <span className="line-clamp-2 text-[13px] font-semibold leading-snug">{p.name}</span>
                            <span className="mt-1 block text-xs text-muted">
                              {p.fromCents != null ? `From ${formatMoney(p.fromCents, p.currency)}` : "Quote"} · MOQ {p.moq}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {t.capture && captureFor !== i && (
                  <button
                    type="button"
                    onClick={() => setCaptureFor(i)}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent text-[15px] font-semibold text-accent-ink"
                  >
                    Send my requirements to the sales team
                  </button>
                )}
                {captureFor === i && t.capture && <LeadCapture turns={turns} prefill={t.capture.prefill} />}
                {t.suggestions && t.suggestions.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {t.suggestions.map((s) => (
                      <li key={s}>
                        <button type="button" onClick={() => send(s)} className="min-h-10 rounded-full border hairline bg-surface px-3.5 py-2 text-left text-[13px] text-fg hover:border-accent hover:text-accent">
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          )}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-subtle">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking the catalogue…
            </p>
          )}
          {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        </div>

        <form
          className="border-t hairline bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border hairline bg-paper p-1.5 focus-within:border-accent">
            <label htmlFor="assistant-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={1200}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Ask about products, MOQ, materials…"
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[16px] outline-none placeholder:text-subtle"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <p className="mt-2 px-1 text-[11px] leading-snug text-subtle">
            AI answers come from our product data. Prices and lead times are confirmed by our team with every quote.
          </p>
        </form>
      </div>
    </div>
  );
}

function LeadCapture({ turns, prefill }: { turns: Turn[]; prefill: { productSlug?: string; quantity?: number; summary?: string } }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [leadNumber, setLeadNumber] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "AI_ASSISTANT",
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone") || undefined,
          company: fd.get("company") || undefined,
          quantity: fd.get("quantity") ? Number(fd.get("quantity")) : undefined,
          productSlug: prefill.productSlug,
          preferredChannel: fd.get("phone") ? "whatsapp" : "email",
          message: prefill.summary,
          transcript: turns.slice(-12).map((t) => ({ role: t.role, content: t.content.slice(0, 800) })),
          website: fd.get("website"),
          sessionId: sessionId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send — please try the quote form.");
      setLeadNumber(data.leadNumber);
      setState("done");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Could not send.");
    }
  }

  if (state === "done") {
    return (
      <div className="flex gap-3 rounded-2xl bg-emerald-500/10 p-4 text-[14px] text-emerald-200 ring-1 ring-emerald-500/30">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        <p>
          Sent — your reference is <strong className="font-mono">{leadNumber}</strong>. Our sales team will contact you shortly with
          pricing and next steps.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-2.5 rounded-2xl bg-surface p-4 ring-1 ring-white/[0.09]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <p className="text-sm font-semibold">Where should we send your quote?</p>
      <input name="name" required maxLength={80} autoComplete="name" placeholder="Your name" className="h-12 w-full rounded-xl border hairline px-3.5 text-[16px] outline-none focus:border-accent" />
      <input name="email" type="email" required maxLength={120} autoComplete="email" placeholder="Email" className="h-12 w-full rounded-xl border hairline px-3.5 text-[16px] outline-none focus:border-accent" />
      <input name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="WhatsApp number (optional)" className="h-12 w-full rounded-xl border hairline px-3.5 text-[16px] outline-none focus:border-accent" />
      <div className="grid grid-cols-2 gap-2.5">
        <input name="company" maxLength={120} autoComplete="organization" placeholder="Team / company" className="h-12 w-full rounded-xl border hairline px-3.5 text-[16px] outline-none focus:border-accent" />
        <input name="quantity" type="number" min={1} max={1000000} inputMode="numeric" defaultValue={prefill.quantity ?? undefined} placeholder="Quantity" className="h-12 w-full rounded-xl border hairline px-3.5 text-[16px] outline-none focus:border-accent" />
      </div>
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <button
        type="submit"
        disabled={state === "sending"}
        className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-ink", state === "sending" && "opacity-70")}
      >
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send to sales
      </button>
      {message && <p className="text-sm text-red-300">{message}</p>}
      <p className="text-[11px] text-subtle">We only use these details to reply to this enquiry.</p>
    </form>
  );
}
