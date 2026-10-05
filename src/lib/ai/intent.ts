/**
 * Intent detection for the grounded (no-LLM) engine and for lead-capture
 * nudges in the LLM path. Pure and unit-tested.
 */

export type Intent =
  | "greeting"
  | "moq"
  | "price"
  | "lead_time"
  | "sample"
  | "material"
  | "customisation"
  | "sizes"
  | "shipping"
  | "payment"
  | "certification"
  | "contact"
  | "recommend"
  | "buy"
  | "about"
  | "unknown";

const RULES: [Intent, RegExp][] = [
  ["certification", /\b(certif|iso|bsci|\bce\b|en ?17092|en ?1621|fia|cik|homolog|approved|standard)/i],
  ["moq", /\b(moq|minimum|min\.? order|smallest order|how many (do i|must|should)|at least)\b/i],
  ["sample", /\b(sample|prototype|trial piece|test piece)\b/i],
  ["lead_time", /\b(lead ?time|how long|turnaround|delivery time|production time|ready by|deadline|when can|days|weeks)\b/i],
  ["price", /\b(price|cost|how much|rate|quote for|per (piece|unit)|cheap|budget|\$|usd|eur|gbp)\b/i],
  ["material", /\b(material|fabric|leather|cowhide|kangaroo|polyester|mesh|gsm|thickness|made (of|from)|lining)\b/i],
  ["customisation", /\b(logo|custom|personali[sz]|branding|my brand|private label|oem|embroider|print|name|number|sponsor|colour|color|design)\b/i],
  ["sizes", /\b(size|sizes|sizing|measure|fit|youth|kids|xl|xxl)\b/i],
  ["shipping", /\b(ship|shipping|freight|courier|deliver|dhl|fedex|export|customs|incoterm|fob|exw|ddp)\b/i],
  ["payment", /\b(pay|payment|paypal|bank|transfer|card|invoice|deposit|advance)\b/i],
  ["contact", /\b(whats ?app|phone|call|email|contact|talk to|speak to|human|person|sales team)\b/i],
  ["buy", /\b(i (need|want|would like)|we (need|want)|order|buy|purchase|interested|enquir|inquir|quote)\b/i],
  ["recommend", /\b(best|recommend|suggest|which|what should|choose|good for|suitable|ideal)\b/i],
  ["about", /\b(who are you|about (you|your company)|factory|where are you|located|location|company)\b/i],
  ["greeting", /^\s*(hi|hello|hey|salam|assalam|good (morning|afternoon|evening))\b/i],
];

export function detectIntents(text: string): Intent[] {
  const found = RULES.filter(([, re]) => re.test(text)).map(([i]) => i);
  return found.length ? found : ["unknown"];
}

/** A quantity mentioned in free text, e.g. "200 shirts", "qty: 50", "5k pcs". */
export function extractQuantity(text: string): number | undefined {
  const m =
    /\b(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?\s?k|\d+)\s*(?:pcs|pieces|units|sets|kits|shirts|jerseys|pairs|suits|jackets|gloves|players|x)\b/i.exec(text) ??
    /\b(?:qty|quantity|order of|around|about|approx\.?)\s*:?\s*(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?\s?k|\d+)\b/i.exec(text);
  if (!m) return undefined;
  const raw = m[1]!.replace(/[,\s]/g, "").toLowerCase();
  const n = raw.endsWith("k") ? Math.round(parseFloat(raw) * 1000) : parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n <= 1_000_000 ? n : undefined;
}

/** Strong buying signal: wants a quote/order, or names a quantity. */
export function isBuyingSignal(text: string): boolean {
  return /\b(quote|order|buy|purchase|need|want|interested|price for)\b/i.test(text) || extractQuantity(text) !== undefined;
}
