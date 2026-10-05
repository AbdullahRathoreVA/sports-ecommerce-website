/**
 * Lexical retrieval over the catalogue, FAQs and guides. With tens of
 * products, a weighted keyword scorer with synonyms beats an embedding store
 * on cost (zero), latency (microseconds) and transparency. Pure — unit tested.
 */

export type Doc = { id: string; kind: "product" | "faq" | "guide"; title: string; text: string; tags: string[] };

const SYNONYMS: Record<string, string[]> = {
  soccer: ["football", "kit", "jersey"],
  football: ["soccer", "kit", "jersey"],
  nfl: ["american", "gridiron", "receiver", "lineman"],
  gridiron: ["american", "nfl"],
  moto: ["motorbike", "motorcycle"],
  motorcycle: ["motorbike", "moto", "leathers"],
  motorbike: ["motorcycle", "moto", "leathers"],
  bike: ["motorbike", "motorcycle"],
  biker: ["motorbike", "leather", "jacket"],
  leathers: ["race", "suit", "leather"],
  karting: ["kart"],
  formula: ["car", "racing", "driver"],
  f1: ["car", "racing", "driver"],
  shirt: ["jersey", "kit"],
  shirts: ["jersey", "kit"],
  jerseys: ["jersey", "kit"],
  uniform: ["kit", "jersey"],
  uniforms: ["kit", "jersey"],
  keeper: ["goalkeeper"],
  gk: ["goalkeeper"],
  logo: ["branding", "custom", "embroidered", "printed"],
  brand: ["private", "label", "oem"],
  oem: ["private", "label"],
  tracksuits: ["tracksuit"],
  hoodies: ["hoodie"],
  school: ["schools"],
  tournament: ["clubs", "schools", "leagues", "kit"],
  team: ["clubs", "kit", "teamwear"],
  club: ["clubs", "kit"],
};

const STOP = new Set(
  "a an the and or of for to in on at is are be can you your we our i me my it this that with what which who how do does any have has need want like about from please hi hello".split(" "),
);

export function tokenize(text: string): string[] {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
  const out = new Set<string>();
  for (const t of base) {
    out.add(t);
    if (t.endsWith("s") && t.length > 3) out.add(t.slice(0, -1));
    for (const s of SYNONYMS[t] ?? []) out.add(s);
  }
  return [...out];
}

export function score(doc: Doc, tokens: string[]): number {
  const title = doc.title.toLowerCase();
  const tags = doc.tags.join(" ").toLowerCase();
  const text = doc.text.toLowerCase();
  let s = 0;
  for (const t of tokens) {
    if (title.includes(t)) s += 6;
    if (tags.includes(t)) s += 4;
    if (text.includes(t)) s += 1;
  }
  return s;
}

export function topK(docs: Doc[], query: string, k: number, kind?: Doc["kind"]): Doc[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  return docs
    .filter((d) => !kind || d.kind === kind)
    .map((d) => ({ d, s: score(d, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.d);
}
