/**
 * Date ranges for admin reports. Days are counted in the business's local
 * time (Pakistan, UTC+5, no DST) — set ADMIN_TZ_OFFSET_MIN to change it — so
 * "Today" means the owner's today, not the server's.
 */

export type RangeKey = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

export type DateRange = {
  key: RangeKey;
  from: Date; // inclusive
  to: Date; // exclusive
  prevFrom: Date;
  prevTo: Date;
  label: string;
  days: number;
};

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

const DAY = 86_400_000;

export function tzOffsetMs(): number {
  const min = Number(process.env.ADMIN_TZ_OFFSET_MIN ?? 300);
  return (Number.isFinite(min) ? min : 300) * 60_000;
}

/** Midnight (local) of the day containing `d`, expressed as a UTC instant. */
export function startOfLocalDay(d: Date, offset = tzOffsetMs()): Date {
  const local = d.getTime() + offset;
  return new Date(Math.floor(local / DAY) * DAY - offset);
}

function parseDay(s: string | undefined, offset: number): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isNaN(t) ? null : new Date(t - offset);
}

export function resolveRange(params: { range?: string; from?: string; to?: string }, now = new Date()): DateRange {
  const offset = tzOffsetMs();
  const today = startOfLocalDay(now, offset);
  const tomorrow = new Date(today.getTime() + DAY);
  let key = (params.range as RangeKey) ?? "30d";
  let from: Date;
  let to: Date;

  if (key === "custom") {
    const f = parseDay(params.from, offset);
    const t = parseDay(params.to, offset);
    if (f && t && t >= f && t.getTime() - f.getTime() <= 366 * DAY) {
      from = f;
      to = new Date(t.getTime() + DAY);
    } else {
      key = "30d";
      from = new Date(tomorrow.getTime() - 30 * DAY);
      to = tomorrow;
    }
  } else if (key === "today") {
    from = today;
    to = tomorrow;
  } else if (key === "yesterday") {
    from = new Date(today.getTime() - DAY);
    to = today;
  } else {
    const n = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    if (!["7d", "30d", "90d"].includes(key)) key = "30d";
    from = new Date(tomorrow.getTime() - n * DAY);
    to = tomorrow;
  }

  const span = to.getTime() - from.getTime();
  const days = Math.round(span / DAY);
  const fmt = (d: Date) =>
    new Date(d.getTime() + offset).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  const label =
    key === "custom" ? `${fmt(from)} – ${fmt(new Date(to.getTime() - DAY))}` : RANGE_OPTIONS.find((o) => o.key === key)?.label ?? "30 days";

  return { key, from, to, prevFrom: new Date(from.getTime() - span), prevTo: from, label, days };
}

/** Local calendar day key (YYYY-MM-DD) for bucketing. */
export function dayKey(d: Date, offset = tzOffsetMs()): string {
  return new Date(d.getTime() + offset).toISOString().slice(0, 10);
}

export function eachDay(range: DateRange): string[] {
  const out: string[] = [];
  for (let t = range.from.getTime(); t < range.to.getTime(); t += DAY) out.push(dayKey(new Date(t)));
  return out;
}
