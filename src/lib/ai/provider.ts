import "server-only";
import type { LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createGateway } from "@ai-sdk/gateway";

/**
 * Free-first model chain. Each configured provider is tried in order; a
 * timeout, rate limit or outage falls through to the next. When none answer,
 * callers use the deterministic grounded engine — the site never shows an AI
 * error to a visitor and never depends on paid credits.
 *
 *   1. Google Gemini   GOOGLE_GENERATIVE_AI_API_KEY   (free tier)
 *   2. Groq            GROQ_API_KEY                   (free tier)
 *   3. Vercel Gateway  AI_GATEWAY_API_KEY / OIDC      (monthly free credits)
 */

export type ModelEntry = { id: string; model: LanguageModel };

let cached: ModelEntry[] | null = null;

export function modelChain(): ModelEntry[] {
  if (cached) return cached;
  const chain: ModelEntry[] = [];
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    const primary = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
    chain.push({ id: `gemini:${primary}`, model: google(primary) });
    chain.push({ id: "gemini:gemini-3.5-flash-lite", model: google("gemini-3.5-flash-lite") });
  }
  if (process.env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    chain.push({ id: "groq:openai/gpt-oss-120b", model: groq("openai/gpt-oss-120b") });
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

/**
 * Run `fn` against each model until one succeeds within `timeoutMs`.
 * Returns null when every provider fails, so callers can fall back.
 */
export async function withModel<T>(
  fn: (model: LanguageModel, signal: AbortSignal) => Promise<T>,
  { timeoutMs = 12_000, label = "ai" }: { timeoutMs?: number; label?: string } = {},
): Promise<{ value: T; engine: string } | null> {
  for (const entry of modelChain()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const value = await fn(entry.model, controller.signal);
      return { value, engine: entry.id };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[${label}] ${entry.id} failed: ${message.slice(0, 160)}`);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
