"use client";

import type { EventName } from "./events";

/**
 * Browser half of the first-party tracker.
 *
 * - Batches events and flushes with sendBeacon (survives navigation/unload).
 * - Session id lives in sessionStorage and rolls over after 30 idle minutes.
 * - Visitor id lives in localStorage — random, never tied to a person.
 *   Visitors sending Global Privacy Control or Do Not Track get no persistent
 *   id at all; the server derives a per-day anonymous one instead.
 * - Exposes a single `track()` so a third-party tool (GA4, Plausible) can be
 *   bolted on later behind the same call without touching call sites.
 */

type Payload = {
  name: EventName;
  path: string;
  productId?: string;
  category?: string;
  label?: string;
  value?: number;
  props?: Record<string, string | number | boolean>;
  ts: number;
};

const SESSION_KEY = "gl_sid";
const SESSION_TS_KEY = "gl_sid_ts";
const VISITOR_KEY = "gl_vid";
const IDLE_MS = 30 * 60 * 1000;

let queue: Payload[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let landing: { referrer: string | null; utm: Record<string, string> } | null = null;

function randomId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return prefix + Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 20);
}

function safeGet(store: Storage, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode / blocked storage — degrade to per-page ids */
  }
}

export function privacyOptOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

function visitorId(): string | null {
  if (privacyOptOut()) return null;
  let id = safeGet(localStorage, VISITOR_KEY);
  if (!id) {
    id = randomId("v_");
    safeSet(localStorage, VISITOR_KEY, id);
  }
  return id;
}

export function sessionId(): string {
  const now = Date.now();
  let id = safeGet(sessionStorage, SESSION_KEY);
  const last = Number(safeGet(sessionStorage, SESSION_TS_KEY) ?? 0);
  if (!id || now - last > IDLE_MS) {
    id = randomId("s_");
    safeSet(sessionStorage, SESSION_KEY, id);
    landing = captureLanding();
  }
  safeSet(sessionStorage, SESSION_TS_KEY, String(now));
  return id;
}

function captureLanding() {
  const params = new URLSearchParams(location.search);
  const utm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
    const v = params.get(k);
    if (v) utm[k] = v.slice(0, 80);
  }
  return { referrer: document.referrer || null, utm };
}

function flush() {
  timer = null;
  if (queue.length === 0) return;
  const events = queue.splice(0, 25);
  const body = JSON.stringify({
    sid: sessionId(),
    vid: visitorId(),
    landing,
    events,
  });
  landing = null;
  const blob = new Blob([body], { type: "application/json" });
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/t", blob);
  if (!sent) {
    fetch("/api/t", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
      () => undefined,
    );
  }
  if (queue.length) schedule(0);
}

function schedule(delay = 1200) {
  if (timer) return;
  timer = setTimeout(flush, delay);
}

export function track(
  name: EventName,
  data: Omit<Payload, "name" | "ts" | "path"> & { path?: string } = {},
) {
  if (typeof window === "undefined") return;
  // Ensure a session exists (and landing info is captured) before queuing.
  sessionId();
  queue.push({
    name,
    path: data.path ?? location.pathname,
    productId: data.productId,
    category: data.category,
    label: data.label?.slice(0, 120),
    value: data.value,
    props: data.props,
    ts: Date.now(),
  });
  // Page views and conversions flush fast; everything else batches.
  schedule(name === "page_view" ? 300 : 1200);
}

export function flushNow() {
  if (timer) clearTimeout(timer);
  flush();
}
