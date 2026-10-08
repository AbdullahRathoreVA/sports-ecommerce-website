/**
 * Squad list parsing: turns a pasted roster (Excel/Sheets columns, CSV, or a
 * WhatsApp message like "Ali Khan 10 M") into players with name, number and
 * size, plus a size breakdown for the quote. Runs in the browser; the server
 * re-validates the result with zod.
 */

export type Player = { name: string; number: string; size: string };
export type RosterResult = {
  players: Player[];
  breakdown: { size: string; count: number }[];
  duplicateNumbers: string[];
  missingSize: number;
};

// Canonical order for the breakdown: kids, youth, then adult.
const SIZE_ORDER = [
  "2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y", "7-8Y", "8-9Y", "9-10Y", "10-11Y", "11-12Y", "12-13Y", "13-14Y",
  "YXS", "YS", "YM", "YL", "YXL",
  "3XS", "2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL",
];

const ALIASES: Record<string, string> = {
  XXS: "2XS", XXXS: "3XS", XXL: "2XL", XXXL: "3XL", XXXXL: "4XL",
  SMALL: "S", MEDIUM: "M", MED: "M", LARGE: "L", "X-LARGE": "XL", XLARGE: "XL", "X-SMALL": "XS", XSMALL: "XS",
  "YOUTH S": "YS", "YOUTH M": "YM", "YOUTH L": "YL", "YOUTH XL": "YXL", "YOUTH XS": "YXS",
};

/** Normalises a size token, or returns null if it isn't one. */
export function normaliseSize(raw: string): string | null {
  const t = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!t) return null;
  if (ALIASES[t]) return ALIASES[t];
  if (SIZE_ORDER.includes(t)) return t;
  // Kids' ages: "8Y", "8-9", "8-9Y", "8/9", "8-9 YRS".
  const age = t.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*(Y|YR|YRS|YEARS)?$/) ?? t.match(/^(\d{1,2})\s*(Y|YR|YRS|YEARS)$/);
  if (age) {
    const a = Number(age[1]);
    const b = age[2] && /^\d+$/.test(age[2]) ? Number(age[2]) : a + 1;
    if (a >= 2 && b === a + 1 && b <= 14) return `${a}-${b}Y`;
  }
  return null;
}

const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s);
  return i === -1 ? SIZE_ORDER.length : i;
};

function splitLine(line: string): string[] {
  // Spreadsheet columns arrive tab-separated; CSV with commas/semicolons; some people use pipes.
  for (const d of ["\t", ",", ";", "|"]) if (line.includes(d)) return line.split(d).map((c) => c.trim());
  return line.trim().split(/\s+/);
}

const isHeader = (cells: string[]) => cells.some((c) => /^(name|player|size)s?$/i.test(c.trim())) && !cells.some((c) => normaliseSize(c));

export function parseRoster(text: string, limit = 500): RosterResult {
  const players: Player[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/^\s*(\d+[.)]|[-•*])\s+/, ""); // drop list bullets like "1." or "-"
    if (!line.trim()) continue;
    const cells = splitLine(line).filter(Boolean);
    if (cells.length === 0 || isHeader(cells)) continue;

    let size = "";
    let number = "";
    const nameParts: string[] = [];
    // Two-word sizes ("Youth M") only appear in whitespace-split lines.
    for (let i = 0; i < cells.length; i++) {
      const pair = i + 1 < cells.length ? normaliseSize(`${cells[i]} ${cells[i + 1]}`) : null;
      if (!size && pair && /^youth$/i.test(cells[i]!)) {
        size = pair;
        i++;
        continue;
      }
      const cell = cells[i]!;
      const asSize = normaliseSize(cell);
      // Prefer a later token for the size: "10" is a shirt number far more often than an age.
      if (!size && asSize && !/^\d+$/.test(cell)) {
        size = asSize;
        continue;
      }
      if (!number && /^#?\d{1,3}$/.test(cell)) {
        number = cell.replace("#", "");
        continue;
      }
      nameParts.push(cell);
    }
    const name = nameParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!name && !number && !size) continue;
    players.push({ name, number, size });
    if (players.length >= limit) break;
  }

  const counts = new Map<string, number>();
  for (const p of players) if (p.size) counts.set(p.size, (counts.get(p.size) ?? 0) + 1);
  const breakdown = [...counts].map(([size, count]) => ({ size, count })).sort((a, b) => sizeRank(a.size) - sizeRank(b.size));

  const seen = new Map<string, number>();
  for (const p of players) if (p.number) seen.set(p.number, (seen.get(p.number) ?? 0) + 1);
  const duplicateNumbers = [...seen].filter(([, n]) => n > 1).map(([num]) => num);

  return { players, breakdown, duplicateNumbers, missingSize: players.filter((p) => !p.size).length };
}

/** "S × 4, M × 10, L × 6" — readable in the admin and in emails. */
export function breakdownText(b: RosterResult["breakdown"]) {
  return b.map((x) => `${x.size} × ${x.count}`).join(", ");
}

export const ROSTER_TEMPLATE = "Name,Number,Size\nAli Khan,10,M\nSara Ahmed,7,S\nJohn Smith,23,XL\n";
