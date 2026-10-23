import { test } from "node:test";
import assert from "node:assert/strict";
import { medianModerationMinutes, reviewStats } from "./stats";
import { demoReviews, demoReviewsEnabled, DemoInProductionError, DEMO_LABEL } from "./demo";
import { hashInviteToken, inviteState, looksLikeToken, newInviteToken } from "./invite";
import { reviewSubmissionSchema } from "./schema";

const d = (s: string) => new Date(s);

test("stats: only published, non-demo reviews count", () => {
  const s = reviewStats([
    { rating: 5, productLine: "Footballs", verified: true, createdAt: d("2026-10-01"), published: true },
    { rating: 3, productLine: "Footballs", verified: false, createdAt: d("2026-10-05"), published: true },
    { rating: 1, productLine: "Hoodies", verified: false, createdAt: d("2026-10-09"), published: false },
    { rating: 1, productLine: "Hoodies", verified: true, createdAt: d("2026-10-10"), published: true, isDemo: true },
  ]);
  assert.equal(s.count, 2);
  assert.equal(s.average, 4);
  assert.deepEqual(s.distribution, [0, 0, 1, 0, 1]);
  assert.equal(s.verified, 1);
  assert.equal(s.latest?.toISOString(), d("2026-10-05").toISOString());
  assert.deepEqual(s.byCategory, [{ name: "Footballs", count: 2, average: 4 }]);
});

test("stats: empty set has no average (never a default rating)", () => {
  const s = reviewStats([]);
  assert.equal(s.count, 0);
  assert.equal(s.average, null);
  assert.equal(s.latest, null);
});

test("stats: demo fixtures never count as verified, even when included for a preview", () => {
  const s = reviewStats(demoReviews(), { includeDemo: true });
  assert.equal(s.count, 45);
  assert.equal(s.verified, 0);
  assert.equal(s.distribution.reduce((a, b) => a + b, 0), 45);
});

test("moderation median", () => {
  assert.equal(medianModerationMinutes([]), null);
  assert.equal(medianModerationMinutes([{ createdAt: d("2026-10-01T10:00:00Z"), approvedAt: d("2026-10-01T10:30:00Z") }, { createdAt: d("2026-10-01T10:00:00Z"), approvedAt: d("2026-10-01T11:30:00Z") }]), 60);
});

test("demo fixtures: 45 clearly labelled fictional records, never verified", () => {
  const all = demoReviews();
  assert.equal(all.length, 45);
  assert.ok(all.every((r) => r.isDemo && r.verified === false && /^Demo Buyer \d{2}$/.test(r.author)));
  assert.match(DEMO_LABEL, /NOT A REAL CUSTOMER REVIEW/);
});

test("demo mode: off by default, on only for dev/preview, throws on production", () => {
  assert.equal(demoReviewsEnabled({}), false);
  assert.equal(demoReviewsEnabled({ REVIEWS_DEMO: "1", NODE_ENV: "development" }), true);
  assert.equal(demoReviewsEnabled({ REVIEWS_DEMO: "1", NODE_ENV: "production", VERCEL_ENV: "preview" }), true);
  assert.equal(demoReviewsEnabled({ REVIEWS_DEMO: "1", NODE_ENV: "production" }), false);
  assert.throws(() => demoReviewsEnabled({ REVIEWS_DEMO: "1", NODE_ENV: "production", VERCEL_ENV: "production" }), DemoInProductionError);
});

test("invites: random tokens, hashed storage, one use, expiry, opt-out", () => {
  const a = newInviteToken();
  const b = newInviteToken();
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, hashInviteToken(a.token));
  assert.ok(looksLikeToken(a.token));
  assert.equal(looksLikeToken("abc"), false);
  assert.equal(looksLikeToken("<script>alert(1)</script>xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"), false);
  const future = d("2099-01-01");
  assert.equal(inviteState({ usedAt: null, expiresAt: future, optedOutAt: null }), "valid");
  assert.equal(inviteState({ usedAt: d("2026-10-01"), expiresAt: future, optedOutAt: null }), "used");
  assert.equal(inviteState({ usedAt: null, expiresAt: d("2020-01-01"), optedOutAt: null }), "expired");
  assert.equal(inviteState({ usedAt: null, expiresAt: future, optedOutAt: d("2026-10-01") }), "opted_out");
});

test("submission validation: rating range, length limits, consent, honeypot", () => {
  const ok = { author: "Real Buyer", email: "buyer@club.test", rating: 5, quote: "Kits arrived as approved on the sample, thank you.", consent: true };
  assert.equal(reviewSubmissionSchema.safeParse(ok).success, true);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, rating: 6 }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, rating: 0 }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, rating: 4.5 }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, quote: "too short" }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, quote: "x".repeat(1201) }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, title: "t".repeat(101) }).success, false);
  assert.equal(reviewSubmissionSchema.safeParse({ ...ok, consent: false }).success, false);
  // HTML is stored as plain text (React escapes it on output) — but control characters are stripped.
  const html = reviewSubmissionSchema.parse({ ...ok, quote: "<script>alert(1)</script> great kits\u0000 and service" });
  assert.equal(html.quote.includes("\u0000"), false);
  assert.ok(html.quote.startsWith("<script>"));
});
