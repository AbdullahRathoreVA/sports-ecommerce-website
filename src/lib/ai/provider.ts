import "server-only";
import type { LanguageModel } from "ai";
import type { SharedV4ProviderOptions } from "@ai-sdk/provider";
import { createCerebras } from "@ai-sdk/cerebras";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createGateway } from "@ai-sdk/gateway";

/**
 * Free-first model chain, fastest first. Each configured provider is tried in
 * order; an error or timeout falls through to the next immediately (no SDK
 * retries). When none answer, callers use the deterministic grounded engine,
 * so the site never shows an AI error and never depends on paid credits.
 *
 *   1. Cerebras        CEREBRAS_API_KEY               (free: ~1M tokens/day, ~2,000+ tok/s)
 *   2. Groq            GROQ_API_KEY                   (free: 1,000 req/day on gpt-oss-120b)
 *   3. Google Gemini   GOOGLE_GENERATIVE_AI_API_KEY   (free: Flash-Lite ~1,000 req/day)
 *   4. Vercel Gateway  AI_GATEWAY_API_KEY / OIDC      (monthly free credits)
 *
 * A provider that hits its quota or is overloaded is skipped for a while
 * (circuit breaker), so one exhausted free tier never slows every reply.
 */

export type ModelEntry = {
  id: string;
  model: LanguageModel;
  /** Provider-specific call options, e.g. turning off "thinking" for chat latency. */
  providerOptions?: SharedV4ProviderOptions;
};

let cached: ModelEntry[] | null = null;

export function modelChain(): ModelEntry[] {
  if (cached) return cached;
  const chain: ModelEntry[] = [];
  if (process.env.CEREBRAS_API_KEY) {
    const cerebras = createCerebras({ apiKey: process.env.CEREBRAS_API_KEY });
    const id = process.env.CEREBRAS_MODEL ?? "gpt-oss-120b";
    chain.push({ id: `cerebras:${id}`, model: cerebras(id) });
  }
  if (process.env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    chain.push({ id: "groq:openai/gpt-oss-120b", model: groq("openai/gpt-oss-120b"), providerOptions: { groq: { reasoningEffort: "low" } } });
    chain.push({ id: "groq:openai/gpt-oss-20b", model: groq("openai/gpt-oss-20b"), providerOptions: { groq: { reasoningEffort: "low" } } });
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    // Flash-Lite first: the larger free quota and lower latency. "Thinking" is
    // switched off/minimal — it adds seconds and isn't needed for chat.
    const lite = process.env.GEMINI_LITE_MODEL ?? "gemini-3.5-flash-lite";
    const flash = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
    chain.push({ id: `gemini:${lite}`, model: google(lite), providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } } });
    chain.push({ id: `gemini:${flash}`, model: google(flash), providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } } });
  }
  if (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN) {
    const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
    chain.push({ id: "gateway:anthropic/claude-haiku-4.5", model: gateway("anthropic/claude-haiku-4.5") });
  }
  cached = chain;
  return chain;
}

export function aiAvailable(): boolean {
  return modelChain().length > 0;
}

/* ── Circuit breaker (per server instance) ─────────────────────────────── */

const skipUntil = new Map<string, number>();

function cooldownFor(message: string): number {
  // Per-minute limits (Groq's free TPM is tight) recover quickly; daily quotas don't.
  if (/per minute|\bTPM\b|\bRPM\b/i.test(message)) return 60_000;
  if (/per day|\bRPD\b|\bTPD\b|quota|exceeded your current/i.test(message)) return 30 * 60_000;
  if (/rate.?limit|429|too many/i.test(message)) return 60_000;
  if (/high demand|overloaded|unavailable|503|502|500/i.test(message)) return 2 * 60_000;
  if (/abort|timeout|timed out/i.test(message)) return 60_000;
  if (/api key|unauthori[sz]ed|401|403|permission/i.test(message)) return 60 * 60_000;
  return 30_000;
}

/** What callers pass straight into generateText: no SDK retries, abort signal, provider options. */
export type CallSettings = { abortSignal: AbortSignal; maxRetries: 0; providerOptions?: ModelEntry["providerOptions"] };

/**
 * Run `fn` against each available model until one succeeds within `timeoutMs`.
 * Returns null when every provider fails, so callers can fall back.
 */
export async function withModel<T>(
  fn: (model: LanguageModel, call: CallSettings) => Promise<T>,
  { timeoutMs = 9_000, label = "ai" }: { timeoutMs?: number; label?: string } = {},
): Promise<{ value: T; engine: string } | null> {
  const now = Date.now();
  for (const entry of modelChain()) {
    if ((skipUntil.get(entry.id) ?? 0) > now) continue;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();
    try {
      const value = await fn(entry.model, { abortSignal: controller.signal, maxRetries: 0, providerOptions: entry.providerOptions });
      skipUntil.delete(entry.id);
      if (Date.now() - started > 4000) console.info(`[${label}] ${entry.id} slow: ${Date.now() - started}ms`);
      return { value, engine: entry.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const cooldown = cooldownFor(message);
      skipUntil.set(entry.id, Date.now() + cooldown);
      console.warn(`[${label}] ${entry.id} failed after ${Date.now() - started}ms (skip ${Math.round(cooldown / 1000)}s): ${message.slice(0, 160)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
