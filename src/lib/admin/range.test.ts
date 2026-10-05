import { test } from "node:test";
import assert from "node:assert/strict";
import { eachDay, resolveRange, startOfLocalDay } from "./range";

// Fixed "now": 2026-10-05 10:00 UTC = 15:00 in Pakistan (UTC+5).
const now = new Date("2026-10-05T10:00:00Z");

test("local midnight is 19:00 UTC the previous day", () => {
  assert.equal(startOfLocalDay(now).toISOString(), "2026-10-04T19:00:00.000Z");
});

test("today spans one local day", () => {
  const r = resolveRange({ range: "today" }, now);
  assert.equal(r.from.toISOString(), "2026-10-04T19:00:00.000Z");
  assert.equal(r.to.toISOString(), "2026-10-05T19:00:00.000Z");
  assert.equal(r.days, 1);
});

test("7 days ends tomorrow-midnight and has an equal previous period", () => {
  const r = resolveRange({ range: "7d" }, now);
  assert.equal(r.days, 7);
  assert.equal(r.prevTo.getTime(), r.from.getTime());
  assert.equal(r.from.getTime() - r.prevFrom.getTime(), r.to.getTime() - r.from.getTime());
  assert.equal(eachDay(r).length, 7);
  assert.equal(eachDay(r).at(-1), "2026-10-05");
});

test("custom range is inclusive of the end day; bad input falls back to 30 days", () => {
  const r = resolveRange({ range: "custom", from: "2026-09-01", to: "2026-09-03" }, now);
  assert.equal(r.days, 3);
  assert.deepEqual(eachDay(r), ["2026-09-01", "2026-09-02", "2026-09-03"]);
  assert.equal(resolveRange({ range: "custom", from: "2026-09-10", to: "2026-09-01" }, now).key, "30d");
  assert.equal(resolveRange({ range: "nonsense" }, now).days, 30);
});
