"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, CheckCircle2, Loader2, Mic, MicOff, Paperclip, Square, UserRound, Volume2, X } from "lucide-react";
import { Markdown } from "@/components/ui/markdown";
import { LogoMark } from "@/components/ui/logo";
import { prepareImage } from "@/components/admin/uploader";
import { speak, speechSupported, stopSpeaking } from "@/lib/voice";
import { sessionId, track } from "@/lib/analytics/client";
import { formatMoney, cn } from "@/lib/utils";
import type { AssistantOpenDetail } from "./bus";

type ProductMini = { slug: string; name: string; image: string | null; fromCents: number | null; currency: string; moq: number; category: string };
type Turn =
  | { role: "user"; content: string; image?: string }
  | {
      role: "assistant";
      content: string;
      products?: ProductMini[];
      suggestions?: string[];
      capture?: { reason: string; prefill: { productSlug?: string; quantity?: number; summary?: string } } | null;
      engine?: string;
      note?: boolean;
    };

const STORE = "gl_assistant_v1";
const EMAIL_STORE = "al_chat_email";

const STARTERS = [
  "What can you make for my football club?",
  "Can you put my logo on team kits?",
  "Can I get a sample first?",
  "How long does production take?",
];

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captureFor, setCaptureFor] = useState<number | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [emailDismissed, setEmailDismissed] = useState(false);
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [canRead, setCanRead] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const started = useRef(false);
  const handledInitial = useRef<string | null>(null);

  const attachments = turns.flatMap((t) => (t.role === "user" && t.image ? [t.image] : []));

  useEffect(() => {
    setCanSpeak(Boolean(speechCtor()));
    setCanRead(speechSupported());
    try {
      const saved = sessionStorage.getItem(STORE);
      // Drop malformed turns (e.g. saved by an older version) instead of crashing on them.
      if (saved) setTurns((JSON.parse(saved) as Turn[]).filter((t) => t && typeof t.content === "string" && (t.role === "user" || t.role === "assistant")));
      setEmail(sessionStorage.getItem(EMAIL_STORE));
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
  }, [turns, busy, handoff]);

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const readAloud = useCallback((i: number, text: string) => {
    if (speakingIdx === i) {
      stopSpeaking();
      setSpeakingIdx(null);
      return;
    }
    setSpeakingIdx(i);
    void speak(text, () => setSpeakingIdx((cur) => (cur === i ? null : cur)));
  }, [speakingIdx]);

  const send = useCallback(
    // `voice`: the question was spoken, so the answer is spoken back (hands-free).
    async (text: string, image?: string, voice = false) => {
      const content = text.trim().slice(0, 1200);
      if (!content || busy) return;
      setError(null);
      if (!started.current) {
        started.current = true;
        track("ai_chat_start");
      }
      track("ai_message");
      const next: Turn[] = [...turns, { role: "user", content, ...(image ? { image } : {}) }];
      setTurns(next);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: next
              .filter((t) => !(t.role === "assistant" && t.note))
              .slice(-12)
              .map((t) => ({ role: t.role, content: t.content })),
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
        if (voice) {
          setSpeakingIdx(next.length);
          void speak(reply, () => setSpeakingIdx((cur) => (cur === next.length ? null : cur)));
        }
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

  async function attach(file: File) {
    setError(null);
    setUploading(true);
    try {
      const prepared = await prepareImage(file);
      const fd = new FormData();
      fd.append("file", prepared);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Upload failed — please try a JPG or PNG under 4 MB.");
      track("ai_message", { label: "attachment" });
      await send(`I've attached an image: ${file.name.slice(0, 80)} (my logo or artwork).`, data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggleVoice() {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    const before = input ? `${input.trim()} ` : "";
    let heard = "";
    rec.onresult = (e) => {
      heard = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ");
      setInput(before + heard);
    };
    rec.onend = () => {
      setListening(false);
      // Spoken question → sent straight away and answered out loud.
      if (heard.trim()) void send(before + heard, undefined, true);
      else inputRef.current?.focus();
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    stopSpeaking();
    setListening(true);
    rec.start();
  }

  if (!open) return null;

  const assistantCount = turns.filter((t) => t.role === "assistant" && !t.note).length;
  const showEmailCard = !email && !emailDismissed && assistantCount >= 1 && !busy;

  return (
    <div className="fixed inset-0 z-[65] lg:inset-auto lg:bottom-6 lg:right-6" role="dialog" aria-modal="true" aria-label={`${brandName} chat`}>
      <div className="absolute inset-0 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 top-[5svh] flex flex-col overflow-hidden rounded-t-2xl bg-paper shadow-2xl animate-rise lg:static lg:h-[min(720px,calc(100svh-48px))] lg:w-[440px] lg:rounded-2xl lg:ring-1 lg:ring-black/10">
        <header className="on-dark flex items-center gap-3 bg-ink px-4 py-3 text-white">
          <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] ring-1 ring-white/10">
            <LogoMark className="h-5" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-signal ring-2 ring-ink" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">{brandName}</p>
            <p className="truncate text-xs text-white/60">Online · instant replies</p>
          </div>
          <button
            type="button"
            onClick={() => setHandoff((v) => !v)}
            aria-pressed={handoff}
            title="Talk to a person"
            className="hidden h-9 items-center gap-1.5 rounded-md border border-white/15 px-2.5 text-xs font-semibold hover:bg-white/10 sm:inline-flex"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden /> Talk to a person
          </button>
          <button type="button" onClick={onClose} aria-label="Close chat" className="grid h-10 w-10 place-items-center rounded-md hover:bg-white/10">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5" aria-live="polite">
          <p className="label text-center text-[0.58rem] text-subtle">Today</p>
          {turns.length === 0 && (
            <div className="flex gap-2.5">
              <Avatar />
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl rounded-tl-md bg-surface px-4 py-3 text-[15px] leading-relaxed shadow-sm ring-1 ring-black/[0.05]">
                  Hi! 👋 Welcome to {brandName}. Ask me anything — products, fabrics, sizes, MOQs or customisation. You can also attach your logo or use your voice.
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {STARTERS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => send(s)}
                        className="w-full rounded-xl border hairline bg-surface px-4 py-2.5 text-left text-sm font-medium text-fg transition-colors hover:border-accent hover:text-accent"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {turns.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="flex flex-col items-end gap-1.5">
                {t.image && (
                  <a href={t.image} target="_blank" rel="noopener" className="relative block h-36 w-36 overflow-hidden rounded-xl bg-surface ring-1 ring-black/10">
                    <Image src={t.image} alt="Your attached image" fill sizes="144px" className="object-contain" />
                  </a>
                )}
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[15px] leading-relaxed text-accent-ink">{t.content}</p>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <Avatar />
                <div className="min-w-0 flex-1 space-y-3">
                  <div className={cn("max-w-[95%] rounded-2xl rounded-tl-md px-4 py-3 text-[15px] shadow-sm ring-1", t.note ? "bg-emerald-50 text-emerald-900 ring-emerald-200" : "bg-surface ring-black/[0.05]")}>
                    <Markdown source={t.content} compact />
                  </div>
                  {canRead && !t.note && (
                    <button
                      type="button"
                      onClick={() => readAloud(i, t.content)}
                      aria-pressed={speakingIdx === i}
                      className={cn("-mt-1.5 inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium", speakingIdx === i ? "bg-accent/10 text-accent" : "text-subtle hover:text-fg")}
                    >
                      {speakingIdx === i ? <Square className="h-3 w-3 fill-current" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
                      {speakingIdx === i ? "Stop" : "Listen"}
                    </button>
                  )}
                  {t.products && t.products.length > 0 && (
                    <ul className="scrollbar-none -mr-4 flex gap-2.5 overflow-x-auto pr-4">
                      {t.products.map((p) => (
                        <li key={p.slug} className="w-[150px] shrink-0">
                          <Link href={`/products/${p.slug}`} onClick={onClose} className="block overflow-hidden rounded-xl bg-surface ring-1 ring-black/[0.06] transition hover:ring-accent">
                            <span className="relative block aspect-square bg-surface-2">
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
                    <button type="button" onClick={() => setCaptureFor(i)} className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-ink text-sm font-semibold text-white">
                      Send my requirements to the sales team <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                  {captureFor === i && t.capture && <LeadCapture turns={turns} attachments={attachments} prefill={t.capture.prefill} defaultEmail={email} />}
                  {t.suggestions && t.suggestions.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {t.suggestions.map((s) => (
                        <li key={s}>
                          <button type="button" onClick={() => send(s)} className="min-h-9 rounded-full border hairline bg-surface px-3.5 py-1.5 text-left text-[13px] text-fg hover:border-accent hover:text-accent">
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className="flex gap-2.5" aria-label="Typing">
              <Avatar />
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-surface px-4 py-3.5 shadow-sm ring-1 ring-black/[0.05]">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-subtle" style={{ animationDelay: `${d * 140}ms` }} />
                ))}
              </div>
            </div>
          )}

          {showEmailCard && (
            <EmailCard
              turns={turns}
              attachments={attachments}
              onDone={(addr) => {
                setEmail(addr);
                try {
                  sessionStorage.setItem(EMAIL_STORE, addr);
                } catch {
                  /* ignore */
                }
                setTurns((prev) => [...prev, { role: "assistant", note: true, content: `Thanks! Our team will email you at **${addr}** — keep chatting here meanwhile.` }]);
              }}
              onDismiss={() => setEmailDismissed(true)}
            />
          )}

          {handoff && <LeadCapture turns={turns} attachments={attachments} prefill={{ summary: "Asked to talk to a person from the chat." }} defaultEmail={email} title="Talk to a person — we'll reply by email" />}

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}
        </div>

        <form
          className="border-t hairline bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <div className="flex items-end gap-1 rounded-2xl border hairline bg-paper p-1.5 focus-within:border-accent">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void attach(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || busy}
              aria-label="Attach your logo or artwork"
              title="Attach logo or artwork"
              className="grid h-11 w-10 shrink-0 place-items-center rounded-xl text-muted hover:text-fg disabled:opacity-40"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Paperclip className="h-5 w-5" aria-hidden />}
            </button>
            <label htmlFor="assistant-input" className="sr-only">
              Your message
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
              placeholder={listening ? "Listening…" : "Type your message…"}
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[16px] outline-none placeholder:text-subtle"
            />
            {canSpeak && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={listening}
                aria-label={listening ? "Stop voice input" : "Speak your message"}
                className={cn("grid h-11 w-10 shrink-0 place-items-center rounded-xl", listening ? "animate-pulse text-accent" : "text-muted hover:text-fg")}
              >
                {listening ? <MicOff className="h-5 w-5" aria-hidden /> : <Mic className="h-5 w-5" aria-hidden />}
              </button>
            )}
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink transition-opacity disabled:opacity-40">
              <ArrowUp className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 px-1">
            <p className="text-[11px] leading-snug text-subtle">AI answers come from our product data; prices are confirmed by our team.</p>
            <button type="button" onClick={() => setHandoff(true)} className="shrink-0 text-[11px] font-semibold text-accent hover:underline sm:hidden">
              Talk to a person
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white" aria-hidden>
      <LogoMark className="h-4" />
    </span>
  );
}

function EmailCard({ turns, attachments, onDone, onDismiss }: { turns: Turn[]; attachments: string[]; onDone: (email: string) => void; onDismiss: () => void }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const lastQuestion = [...turns].reverse().find((t) => t.role === "user")?.content ?? "";

  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      setMessage("Please enter a valid email.");
      return;
    }
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "AI_ASSISTANT",
          name: "Chat visitor",
          email: value.trim(),
          preferredChannel: "email",
          message: `Left their email in the website chat. Last question: ${lastQuestion}`.slice(0, 4000),
          transcript: turns.slice(-12).map((t) => ({ role: t.role, content: t.content.slice(0, 800) })),
          attachments: attachments.slice(0, 6),
          sessionId: sessionId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save — please try again.");
      track("ai_lead_created");
      onDone(value.trim());
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Could not save.");
    }
  }

  return (
    <div className="ml-10 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/[0.05]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Get our team&apos;s reply by email</p>
          <p className="mt-0.5 text-xs text-muted">A real person follows up with prices and next steps — in writing.</p>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Not now" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-subtle hover:text-fg">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <form
        className="mt-3 flex overflow-hidden rounded-xl border hairline focus-within:border-accent"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="chat-email" className="sr-only">
          Your email
        </label>
        <input id="chat-email" type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Please enter your email" className="h-11 min-w-0 flex-1 bg-transparent px-3.5 text-[15px] outline-none" />
        <button type="submit" disabled={state === "sending"} aria-label="Save email" className="grid w-12 place-items-center bg-accent text-accent-ink disabled:opacity-60">
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </form>
      {message && <p className="mt-2 text-xs text-red-700">{message}</p>}
    </div>
  );
}

function LeadCapture({
  turns,
  attachments,
  prefill,
  defaultEmail,
  title = "Where should we send your quote?",
}: {
  turns: Turn[];
  attachments: string[];
  prefill: { productSlug?: string; quantity?: number; summary?: string };
  defaultEmail: string | null;
  title?: string;
}) {
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
          attachments: attachments.slice(0, 6),
          website: fd.get("website"),
          sessionId: sessionId(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send — please try the quote form.");
      setLeadNumber(data.leadNumber);
      setState("done");
      track("ai_lead_created");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Could not send.");
    }
  }

  if (state === "done") {
    return (
      <div className="ml-10 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-[14px] text-emerald-900 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <p>
          Sent — your reference is <strong className="font-mono">{leadNumber}</strong>. Our team will reply by email with pricing and next steps.
        </p>
      </div>
    );
  }

  const field = "h-11 w-full rounded-xl border hairline bg-paper px-3.5 text-[16px] outline-none focus:border-accent";
  return (
    <form
      className="ml-10 space-y-2.5 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/[0.05]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(e.currentTarget);
      }}
    >
      <p className="text-sm font-semibold">{title}</p>
      <input name="name" required maxLength={80} autoComplete="name" placeholder="Your name" className={field} />
      <input name="email" type="email" required maxLength={120} autoComplete="email" defaultValue={defaultEmail ?? undefined} placeholder="Email" className={field} />
      <input name="phone" type="tel" maxLength={30} autoComplete="tel" placeholder="WhatsApp number (optional)" className={field} />
      <div className="grid grid-cols-2 gap-2.5">
        <input name="company" maxLength={120} autoComplete="organization" placeholder="Team / company" className={field} />
        <input name="quantity" type="number" min={1} max={1000000} inputMode="numeric" defaultValue={prefill.quantity ?? undefined} placeholder="Quantity" className={field} />
      </div>
      {attachments.length > 0 && <p className="text-xs text-muted">📎 {attachments.length} attached image{attachments.length > 1 ? "s" : ""} will be included.</p>}
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <button type="submit" disabled={state === "sending"} className={cn("flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-[15px] font-semibold text-white", state === "sending" && "opacity-70")}>
        {state === "sending" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Send to our team
      </button>
      {message && <p className="text-sm text-red-700">{message}</p>}
      <p className="text-[11px] text-subtle">We only use these details to reply to this enquiry.</p>
    </form>
  );
}
