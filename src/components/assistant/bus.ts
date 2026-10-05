"use client";

/**
 * Tiny event bus so any button on the site can open the assistant (optionally
 * with a prefilled question or product context) without prop drilling or a
 * global store.
 */
export type AssistantOpenDetail = { question?: string; productSlug?: string; mode?: "assistant" | "oem" };

const EVENT = "gl:assistant-open";

export function openAssistant(detail: AssistantOpenDetail = {}) {
  window.dispatchEvent(new CustomEvent<AssistantOpenDetail>(EVENT, { detail }));
}

export function onAssistantOpen(handler: (detail: AssistantOpenDetail) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<AssistantOpenDetail>).detail ?? {});
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
