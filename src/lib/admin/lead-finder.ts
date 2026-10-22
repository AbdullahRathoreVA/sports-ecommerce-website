import "server-only";

/**
 * Lead finder: real businesses that buy what Alrobel makes, near a city the team chooses.
 *
 * Source: OpenStreetMap (free, no key) — clubs, schools, sports shops, motorbike dealers, gyms,
 * karting tracks — with whatever contact details the map holds (phone, email, website, socials).
 * Nothing is invented: a result exists on the map or it is not shown. Idea and filtering rules
 * carried over from Titan Omega's prospecting engine (directories are not leads; dedupe by
 * domain); optional web search via Tavily when TAVILY_API_KEY is set.
 */

export const FINDER_KINDS = {
  football: { label: "Football clubs & academies", phrases: ["football club", "sports club", "sports centre"], filters: ['nwr["sport"="soccer"]["name"]["leisure"!="pitch"]', 'nwr["club"="sport"]["sport"~"soccer|football"]["name"]'], pitch: "team kits, training wear and match balls" },
  schools: { label: "Schools & colleges", phrases: ["school", "college"], filters: ['nwr["amenity"~"^(school|college)$"]["name"]'], pitch: "school sports kits, PE uniforms and house colours" },
  sportshops: { label: "Sports shops", phrases: ["sports shop"], filters: ['nwr["shop"="sports"]["name"]'], pitch: "private-label teamwear, balls and goalkeeper gloves under your own brand" },
  motorbike: { label: "Motorbike shops & clubs", phrases: ["motorcycle shop", "motorcycle", "motorcycle dealer"], filters: ['nwr["shop"="motorcycle"]["name"]', 'nwr["club"="motorcycle"]["name"]'], pitch: "leather race suits, jackets and gloves under your brand" },
  karting: { label: "Karting & racing tracks", phrases: ["karting", "kart", "raceway"], filters: ['nwr["sport"~"karting|motor"]["name"]'], pitch: "kart and car racing suits for teams and rental fleets" },
  gyms: { label: "Gyms & fitness clubs", phrases: ["fitness centre", "gym", "boxing club"], filters: ['nwr["leisure"="fitness_centre"]["name"]', 'nwr["sport"~"boxing|martial_arts|mma"]["name"]'], pitch: "branded gym wear, tracksuits and hoodies for members and staff" },
  clothing: { label: "Clothing & leather boutiques", phrases: ["clothes shop", "leather shop", "boutique"], filters: ['nwr["shop"~"^(clothes|leather|fashion)$"]["name"]'], pitch: "leather jackets and sportswear under your own label" },
} as const;

export type FinderKind = keyof typeof FINDER_KINDS;

export type Candidate = {
  osmId: string;
  osmUrl: string;
  name: string;
  kind: FinderKind;
  phone: string | null;
  email: string | null;
  website: string | null;
  social: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
};

const UA = "AlrobelSportswearLeadFinder/1.0 (+https://alrobelsportswear.com/contact)";

async function getJson(url: string, init?: RequestInit, timeoutMs = 25_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, headers: { "User-Agent": UA, Accept: "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** City / area name → coordinates and country code (OpenStreetMap Nominatim). */
export async function geocode(place: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(place)}`;
  const rows = (await getJson(url, undefined, 12_000)) as { lat: string; lon: string; display_name: string; address?: { country_code?: string; city?: string; town?: string; state?: string } }[];
  const r = rows[0];
  if (!r) return null;
  return { lat: Number(r.lat), lon: Number(r.lon), label: r.display_name, country: r.address?.country_code?.toUpperCase() ?? null, city: r.address?.city ?? r.address?.town ?? null };
}

const pick = (t: Record<string, string>, ...keys: string[]) => {
  for (const k of keys) if (t[k]) return t[k]!.split(";")[0]!.trim();
  return null;
};

const normaliseUrl = (u: string | null) => {
  if (!u) return null;
  const v = u.trim();
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

type Tags = Record<string, string>;

function toCandidate(kind: FinderKind, type: string, id: number | string, t: Tags, lat: number | null, lon: number | null, fallback: { city: string | null; country: string | null }, addr?: Record<string, string>): Candidate | null {
  const name = t.name?.trim();
  if (!name) return null;
  const street = [t["addr:housenumber"] ?? addr?.house_number, t["addr:street"] ?? addr?.road].filter(Boolean).join(" ");
  const city = t["addr:city"] ?? addr?.city ?? addr?.town ?? addr?.village ?? addr?.suburb ?? fallback.city;
  return {
    osmId: `${type}/${id}`,
    osmUrl: `https://www.openstreetmap.org/${type}/${id}`,
    name,
    kind,
    phone: pick(t, "phone", "contact:phone", "contact:mobile", "mobile"),
    email: pick(t, "email", "contact:email")?.toLowerCase() ?? null,
    website: normaliseUrl(pick(t, "website", "contact:website", "url")),
    social: normaliseUrl(pick(t, "contact:instagram", "contact:facebook", "instagram", "facebook")),
    address: [street, t["addr:postcode"] ?? addr?.postcode, city].filter(Boolean).join(", ") || null,
    city: city ?? null,
    country: fallback.country,
    lat,
    lon,
  };
}

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

/** Overpass: every matching place in the radius (fast when the public servers aren't overloaded). */
async function overpass(kind: FinderKind, spot: { lat: number; lon: number; city: string | null; country: string | null }, r: number): Promise<Candidate[]> {
  const body = FINDER_KINDS[kind].filters.map((f) => `${f}(around:${r},${spot.lat},${spot.lon});`).join("\n");
  const query = `[out:json][timeout:20];(\n${body}\n);out center tags 150;`;
  const data = (await Promise.any(
    OVERPASS.map((url) => getJson(url, { method: "POST", body: new URLSearchParams({ data: query }), headers: { "Content-Type": "application/x-www-form-urlencoded" } }, 12_000)),
  )) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Tags }[] };
  return (data.elements ?? []).map((el) => toCandidate(kind, el.type, el.id, el.tags ?? {}, el.lat ?? el.center?.lat ?? null, el.lon ?? el.center?.lon ?? null, spot)).filter(Boolean) as Candidate[];
}

/** Nominatim: named places of a type inside a box around the city (always available, max 40 per phrase). */
async function nominatim(kind: FinderKind, spot: { lat: number; lon: number; city: string | null; country: string | null }, km: number): Promise<Candidate[]> {
  const dLat = km / 111;
  const dLon = km / (111 * Math.max(0.2, Math.cos((spot.lat * Math.PI) / 180)));
  const box = [spot.lon - dLon, spot.lat + dLat, spot.lon + dLon, spot.lat - dLat].map((n) => n.toFixed(5)).join(",");
  const out: Candidate[] = [];
  for (const phrase of FINDER_KINDS[kind].phrases) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=40&extratags=1&addressdetails=1&bounded=1&viewbox=${box}&q=${encodeURIComponent(phrase)}`;
    const rows = (await getJson(url, undefined, 12_000).catch(() => [])) as { osm_type: string; osm_id: number; name?: string; lat: string; lon: string; extratags?: Tags; address?: Record<string, string> }[];
    for (const r of rows) {
      const c = toCandidate(kind, r.osm_type, r.osm_id, { ...(r.extratags ?? {}), name: r.name ?? "" }, Number(r.lat), Number(r.lon), spot, r.address);
      if (c) out.push(c);
    }
    // Nominatim's usage policy: at most one request per second.
    await new Promise((res) => setTimeout(res, 1100));
  }
  return out;
}

/** Search OpenStreetMap around a place: Overpass and Nominatim together, merged and de-duplicated. */
export async function findOnMap(kind: FinderKind, place: string, radiusKm: number): Promise<{ where: string; results: Candidate[] } | { error: string }> {
  const spot = await geocode(place).catch(() => null);
  if (!spot) return { error: `Couldn't find “${place}” on the map. Try “City, Country”, e.g. “Manchester, UK”.` };
  const km = Math.min(50, Math.max(2, radiusKm));
  await new Promise((res) => setTimeout(res, 1100));
  const [a, b] = await Promise.allSettled([overpass(kind, spot, Math.round(km * 1000)), nominatim(kind, spot, km)]);
  const all = [...(a.status === "fulfilled" ? a.value : []), ...(b.status === "fulfilled" ? b.value : [])];
  if (all.length === 0 && a.status === "rejected" && b.status === "rejected") return { error: "The map services are busy right now — please try again in a minute." };
  const seen = new Set<string>();
  const results: Candidate[] = [];
  for (const c of all) {
    const key = c.website?.replace(/^https?:\/\/(www\.)?/i, "").split("/")[0] || `${c.name.toLowerCase()}|${c.city ?? ""}`;
    if (seen.has(key) || seen.has(c.osmId)) continue;
    seen.add(key);
    seen.add(c.osmId);
    results.push(c);
  }
  // Reachable first: email, then phone, then website.
  const reach = (c: Candidate) => (c.email ? 4 : 0) + (c.phone ? 2 : 0) + (c.website || c.social ? 1 : 0);
  results.sort((x, y) => reach(y) - reach(x) || x.name.localeCompare(y.name));
  return { where: spot.label, results };
}

// ── Optional: web search (same directory filter as Titan Omega's prospecting engine) ──

const BLOCKED = ["alibaba", "aliexpress", "amazon", "ebay", "etsy", "indiamart", "made-in-china", "yelp", "yellowpages", "tripadvisor", "trustpilot", "facebook", "instagram", "twitter", "x.com", "linkedin", "pinterest", "tiktok", "youtube", "reddit", "wikipedia", "quora", "medium", "google", "bing", "crunchbase", "glassdoor", "indeed", "booking", "justdial", "clutch", "upwork", "fiverr", "github"];

export const webSearchAvailable = () => Boolean(process.env.TAVILY_API_KEY);

export async function findOnWeb(kind: FinderKind, place: string): Promise<Candidate[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  const q = `${FINDER_KINDS[kind].label} in ${place}`;
  const data = (await getJson("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: key, query: q, max_results: 20 }) }).catch(() => ({ results: [] }))) as { results: { title: string; url: string }[] };
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const r of data.results ?? []) {
    let host = "";
    try {
      host = new URL(r.url).hostname.replace(/^www\d*\./, "").toLowerCase();
    } catch {
      continue;
    }
    if (!host || seen.has(host) || BLOCKED.some((b) => host === b || host.startsWith(`${b}.`) || host.includes(`.${b}.`))) continue;
    if (/\/(search|directory|listing|category|tag|blog|news|article)/i.test(r.url)) continue;
    seen.add(host);
    const name = (r.title.split(/\s[|–—-]\s/)[0] ?? "").trim();
    out.push({ osmId: `web/${host}`, osmUrl: r.url, name: name.length > 2 && name.length < 60 ? name : host, kind, phone: null, email: null, website: `https://${host}`, social: null, address: null, city: null, country: null, lat: null, lon: null });
  }
  return out;
}

/** A first message the team can send — honest, short, and specific to the kind of business. */
export function outreachMessage(c: Pick<Candidate, "name" | "kind">) {
  const pitch = FINDER_KINDS[c.kind].pitch;
  return `Hello ${c.name} team,\n\nI'm writing from Alrobel Sportswear — we manufacture ${pitch} in our own factory in Sialkot, Pakistan, and ship worldwide.\n\nEverything is made to order in your colours with your logo, from 50 pieces per design, and you can order a sample first ($100) to check the quality.\n\nWould you like our catalogue or a free design mockup for your next order?\n\nBest regards,\nAlrobel Sportswear\nhttps://alrobelsportswear.com`;
}
