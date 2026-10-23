/**
 * Review figures shown on the website — pure functions, unit-tested.
 * Only published, non-demo reviews count; pending, hidden, rejected and
 * spam reviews never move the average.
 */

export type StatRow = { rating: number | null; productLine: string | null; verified: boolean; createdAt: Date; published?: boolean; isDemo?: boolean };

export type ReviewStats = {
  count: number;
  rated: number;
  average: number | null;
  /** index 0 = 1 star … index 4 = 5 stars */
  distribution: [number, number, number, number, number];
  verified: number;
  latest: Date | null;
  byCategory: { name: string; count: number; average: number | null }[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function reviewStats(rows: StatRow[], opts: { includeDemo?: boolean } = {}): ReviewStats {
  const live = rows.filter((r) => r.published !== false && (opts.includeDemo || !r.isDemo));
  const rated = live.filter((r) => r.rating != null && r.rating >= 1 && r.rating <= 5);
  const distribution: ReviewStats["distribution"] = [0, 0, 0, 0, 0];
  for (const r of rated) distribution[r.rating! - 1]++;
  const sum = rated.reduce((s, r) => s + r.rating!, 0);
  const cats = new Map<string, StatRow[]>();
  for (const r of live) {
    const k = r.productLine?.trim() || "General";
    cats.set(k, [...(cats.get(k) ?? []), r]);
  }
  return {
    count: live.length,
    rated: rated.length,
    average: rated.length ? round1(sum / rated.length) : null,
    distribution,
    verified: live.filter((r) => r.verified && !r.isDemo).length,
    latest: live.reduce<Date | null>((d, r) => (!d || r.createdAt > d ? r.createdAt : d), null),
    byCategory: [...cats.entries()]
      .map(([name, rs]) => {
        const rr = rs.filter((r) => r.rating != null);
        return { name, count: rs.length, average: rr.length ? round1(rr.reduce((s, r) => s + r.rating!, 0) / rr.length) : null };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

/** Median minutes from submission to approval (moderation speed for the admin). */
export function medianModerationMinutes(rows: { createdAt: Date; approvedAt: Date | null }[]): number | null {
  const mins = rows.filter((r) => r.approvedAt).map((r) => (r.approvedAt!.getTime() - r.createdAt.getTime()) / 60_000).sort((a, b) => a - b);
  if (!mins.length) return null;
  const mid = Math.floor(mins.length / 2);
  return Math.round(mins.length % 2 ? mins[mid]! : (mins[mid - 1]! + mins[mid]!) / 2);
}
