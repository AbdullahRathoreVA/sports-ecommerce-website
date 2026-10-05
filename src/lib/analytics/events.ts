/**
 * The complete vocabulary of first-party analytics events.
 *
 * A whitelist, not a free-for-all: the collector drops any name not listed,
 * so the events table cannot be polluted by a script posting garbage.
 * Events marked `server` are recorded by the route that performs the action
 * (more reliable than a browser beacon, and impossible to fake).
 */
export const EVENT_NAMES = [
  "page_view",
  "product_view",
  "product_click",
  "category_view",
  "search",
  "filter_use",
  "add_to_cart",
  "remove_from_cart",
  "checkout_start",
  "purchase", // server
  "quote_start",
  "quote_submit", // server
  "contact_submit", // server
  "whatsapp_click",
  "phone_click",
  "email_click",
  "cta_click",
  "nav_click",
  "oem_cta",
  "customizer_start",
  "customizer_complete",
  "finder_start",
  "finder_complete",
  "ai_chat_start",
  "ai_message",
  "ai_lead_created", // server
  "video_play",
  "spec_download",
  "heartbeat",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const SERVER_ONLY_EVENTS: ReadonlySet<EventName> = new Set([
  "purchase",
  "quote_submit",
  "contact_submit",
  "ai_lead_created",
]);

export function isEventName(value: string): value is EventName {
  return (EVENT_NAMES as readonly string[]).includes(value);
}

/** Human labels for the admin. */
export const EVENT_LABELS: Record<EventName, string> = {
  page_view: "Page view",
  product_view: "Product view",
  product_click: "Product click",
  category_view: "Category view",
  search: "Search",
  filter_use: "Filter used",
  add_to_cart: "Add to cart",
  remove_from_cart: "Remove from cart",
  checkout_start: "Checkout started",
  purchase: "Order placed",
  quote_start: "Quote started",
  quote_submit: "Quote submitted",
  contact_submit: "Contact message",
  whatsapp_click: "WhatsApp click",
  phone_click: "Call click",
  email_click: "Email click",
  cta_click: "CTA click",
  nav_click: "Navigation click",
  oem_cta: "OEM CTA",
  customizer_start: "Design Studio opened",
  customizer_complete: "Design submitted",
  finder_start: "Product finder started",
  finder_complete: "Product finder completed",
  ai_chat_start: "AI chat started",
  ai_message: "AI message",
  ai_lead_created: "AI lead captured",
  video_play: "Video played",
  spec_download: "Spec sheet download",
  heartbeat: "Heartbeat",
};
