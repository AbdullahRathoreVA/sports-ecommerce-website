/** Labels for every way a lead can arrive (admin lists, filters, lead pages). */
export const LEAD_SOURCES = ["QUOTE_FORM", "PRODUCT_PAGE", "CONTACT_FORM", "AI_ASSISTANT", "DESIGN_STUDIO", "PRODUCT_FINDER", "PRICE_OFFER", "MANUAL", "LEAD_FINDER"] as const;

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  QUOTE_FORM: "Quote form",
  PRODUCT_PAGE: "Product page",
  CONTACT_FORM: "Contact form",
  AI_ASSISTANT: "AI chat",
  DESIGN_STUDIO: "Design Studio",
  PRODUCT_FINDER: "Product finder",
  PRICE_OFFER: "Website price offer",
  MANUAL: "Added by team",
  LEAD_FINDER: "Lead finder",
};

/** Where a hand-added lead came from — kept in `meta.origin` and shown on the lead. */
export const MANUAL_ORIGINS = ["WhatsApp", "Phone call", "Email", "Walk-in / factory visit", "Exhibition / trade show", "Referral", "Social media", "Other"] as const;
