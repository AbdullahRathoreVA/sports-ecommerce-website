# Customer reviews — how the system works

Built on the existing stack (Next.js 16 server components + server actions, Prisma 7 / Postgres, existing admin
auth and audit log). No new services. Research behind each decision: [RESEARCH.md](./RESEARCH.md).

## Rules the code enforces
- **Only real customers, own words, with consent.** Every public submission records `consentAt` + `consentVersion`
  (`src/lib/reviews/schema.ts`). Admin-added reviews need the "these are a real customer's own words…" confirmation.
- **Verified buyer** is set in exactly two ways: a review submitted through a valid one-time invite created for a real
  order (`verifiedVia = "invite"`), or an admin pressing *Verify* and recording the order/invoice number checked
  (`verifiedVia = "admin"`, `verifiedNote`, `verifiedBy`, `verifiedAt`). The browser can never send `verified`.
  An email that matches a customer is shown to the team as a *hint* only — it is not proof.
- **Pending → published** only by an admin; publishing requires recorded consent and is blocked for spam and demo rows.
- **Critical reviews are not suppressed.** *Reject* is for spam/abuse/non-customers and requires a reason; rejected rows
  are kept under "Rejected / spam" for the record.
- **Public data**: rating, title, text, name, role, company, country, photo, category, date, reply, verified flag.
  Never public: email, order, verification note, moderation note, consent record.

## Flow
1. Order set to **Shipped/Delivered** → appears under Admin → Reviews → *Review requests*.
2. *Ask for a review* → **Email the request** (sent from info@ via SMTP when configured) or **Create link for WhatsApp**.
   The link `/reviews/new?invite=<token>` works once and expires after 60 days (`INVITE_DAYS`). Only a SHA-256 hash of
   the token is stored (`ReviewInvite.tokenHash`). The customer can opt out from the page (`Customer.reviewOptOut`).
3. Customer opens the link (`clickedAt` recorded) and submits → review is **pending + verified via invite**, invite
   marked used inside the same transaction (a second use returns 410).
4. Team publishes, replies publicly, adds a private note, verifies/unverifies, asks a question by email, or rejects.
5. `/reviews` shows the published set: average, 5→1 distribution, category breakdown, latest date, verified count,
   filters (product, stars, verified, sort) and 12-per-page pagination. Empty state when nothing is published.

## Statistics (`src/lib/reviews/stats.ts`)
Counted: `published = true`, `isDemo = false`, `rejected = false`, `spam = false`. Average = mean of 1–5 ratings of
those rows, one decimal; no rows → no average (never a default). Admin tiles: published + average, verified %,
waiting/rejected, median minutes from submission to approval, review requests answered / created and opened.

## Structured data
None for reviews, on purpose: Google does not show review stars for a business's reviews about itself on its own
site ("self-serving", 2019) and fabricated/undisclosed-incentive reviews in markup are prohibited.

## Demo fixtures (development only)
45 fictional records in `src/lib/reviews/demo.ts` ("Demo Buyer 01–45").
- Enable: `REVIEWS_DEMO=1 npm run dev` (or the "gridline-dev-demo-reviews" launch config). Works only when
  `NODE_ENV=development` or `VERCEL_ENV=preview`.
- Never stored in the database, never verified, every card stamped **DEMO DATA — NOT A REAL CUSTOMER REVIEW**, plus a
  page-wide banner.
- Production safety: `next.config.ts` throws at build time when `VERCEL_ENV=production` and `REVIEWS_DEMO=1`;
  `demoReviewsEnabled()` throws on production at runtime; DB queries filter `isDemo = false`; publishing a demo row is
  refused server-side.

## Tests
- Unit (`src/lib/reviews/reviews.test.ts`, run by `npm test`): stats, empty set, demo exclusion/never-verified,
  demo guard (throws on production), invite tokens (random, hashed, single-use, expiry, opt-out), validation
  (rating range, length, consent, control-character stripping).
- End-to-end against a running server (`.gstack/qa-reviews.mjs` + `.gstack/qa-reviews-db.ts`, QA TEST data,
  cleaned afterwards): 33 checks incl. honeypot, rate limit, duplicate guard, email-match not verified, invite
  single-use/expiry, pending hidden, published visible, XSS escaped, no private data in HTML, filters, admin login.

## Configuration
- Email for review requests and reviewer questions: SMTP (Zoho) — `SMTP_PASS` must be set in Vercel (app password
  for info@). Without it, links are created and can be sent by WhatsApp; the admin shows "not sent".
- Database: additive columns on `Testimonial`, new `ReviewInvite`, `Customer.reviewOptOut` (applied with `prisma db push`).
