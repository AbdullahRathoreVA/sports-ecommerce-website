/**
 * Simulated demo records — orders, leads, customers and website traffic.
 *
 * Purpose: let the client review the admin (pipelines, charts, AI analyst)
 * before the site has real visitors. Every row is flagged `isDemo`, the admin
 * labels views that include it, and Admin → Settings → "Purge demo data"
 * deletes it in one click. Real traffic and real enquiries are never flagged.
 *
 * Deterministic (seeded PRNG) so re-seeding produces the same demo.
 */

export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rand = ReturnType<typeof prng>;

export function pick<T>(r: Rand, items: readonly T[]): T {
  return items[Math.floor(r() * items.length)]!;
}

export function weighted<T>(r: Rand, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [value, w] of entries) {
    x -= w;
    if (x <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

export const DEMO_COUNTRIES = [
  ["GB", 22],
  ["US", 17],
  ["PK", 9],
  ["DE", 8],
  ["AE", 7],
  ["AU", 6],
  ["CA", 5],
  ["NL", 4],
  ["FR", 4],
  ["SA", 3],
  ["IE", 3],
  ["IT", 3],
  ["ZA", 2],
  ["SE", 2],
  ["NZ", 2],
] as const;

export const DEMO_CHANNELS = [
  ["organic", 34],
  ["direct", 25],
  ["social", 22],
  ["referral", 8],
  ["paid", 4],
  ["ai", 4],
  ["email", 3],
] as const;

export const DEMO_REFERRERS: Record<string, string[]> = {
  organic: ["google.com", "bing.com", "duckduckgo.com"],
  social: ["instagram.com", "facebook.com", "whatsapp.com", "linkedin.com", "tiktok.com"],
  referral: ["alibaba.com", "pakistantradeportal.gov.pk", "reddit.com"],
  ai: ["chatgpt.com", "perplexity.ai", "gemini.google.com"],
  paid: ["google.com"],
  email: [],
  direct: [],
};

export const DEMO_DEVICES = [
  ["mobile", 63],
  ["desktop", 31],
  ["tablet", 6],
] as const;

export const DEMO_BROWSERS: Record<string, readonly (readonly [string, number])[]> = {
  mobile: [
    ["Chrome", 55],
    ["Safari", 38],
    ["Samsung Internet", 7],
  ],
  desktop: [
    ["Chrome", 66],
    ["Edge", 16],
    ["Safari", 12],
    ["Firefox", 6],
  ],
  tablet: [
    ["Safari", 70],
    ["Chrome", 30],
  ],
};

export const DEMO_OS: Record<string, readonly (readonly [string, number])[]> = {
  mobile: [
    ["Android", 58],
    ["iOS", 42],
  ],
  desktop: [
    ["Windows", 72],
    ["macOS", 26],
    ["Linux", 2],
  ],
  tablet: [
    ["iOS", 75],
    ["Android", 25],
  ],
};

export const DEMO_COMPANIES = [
  { name: "Demo · Riverside Juniors FC", contact: "Sam Carter", country: "GB" },
  { name: "Demo · Northgate Sunday League", contact: "Priya Shah", country: "GB" },
  { name: "Demo · Lakeside Raceway Club", contact: "Daniel Weber", country: "DE" },
  { name: "Demo · Apex Moto Store", contact: "Chris Morgan", country: "AU" },
  { name: "Demo · Gulf Track Days", contact: "Omar Haddad", country: "AE" },
  { name: "Demo · Westfield High Athletics", contact: "Jordan Lee", country: "US" },
  { name: "Demo · Kart Academy Utrecht", contact: "Lotte de Vries", country: "NL" },
  { name: "Demo · Harbour Leather Boutique", contact: "Emma Collins", country: "IE" },
  { name: "Demo · Prairie Gridiron Club", contact: "Mike Turner", country: "CA" },
  { name: "Demo · Red Sea Riders", contact: "Faisal Al-Amri", country: "SA" },
] as const;
