/**
 * DEMO REVIEW FIXTURES — FICTIONAL, FOR DEVELOPMENT AND QA ONLY.
 *
 * These are not customers and not testimonials. They exist so the review
 * page, filters, pagination and layouts can be tested before real reviews
 * arrive. Isolation:
 *  - never written to the database (no seed inserts them);
 *  - shown only when REVIEWS_DEMO=1 in local development or a Vercel preview;
 *  - REVIEWS_DEMO=1 on production fails the build (next.config.ts) and throws here;
 *  - every card is stamped "DEMO DATA — NOT A REAL CUSTOMER REVIEW";
 *  - never verified, never in structured data, never in the production API.
 * Enable locally:  REVIEWS_DEMO=1 npm run dev   ·   Disable: unset it.
 */

export const DEMO_LABEL = "DEMO DATA — NOT A REAL CUSTOMER REVIEW";

export class DemoInProductionError extends Error {}

/** True only for local development / Vercel previews with REVIEWS_DEMO=1. Throws on production. */
export function demoReviewsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  if (env.REVIEWS_DEMO !== "1") return false;
  if (env.VERCEL_ENV === "production") throw new DemoInProductionError("REVIEWS_DEMO=1 is not allowed on production: demo reviews would look like real ones.");
  return env.NODE_ENV === "development" || env.VERCEL_ENV === "preview";
}

export type DemoReview = {
  id: string;
  isDemo: true;
  author: string;
  title: string;
  quote: string;
  rating: number;
  productLine: string;
  verified: false;
  company: null;
  country: null;
  role: null;
  photo: null;
  response: string | null;
  createdAt: Date;
};

// [category, stars, title, text, optional demo company reply]
const ROWS: [string, number, string, string, string?][] = [
  ["Soccer uniforms", 5, "Custom kit design preview", "The design preview makes it easier to compare colour combinations and organize our kit requirements before placing an order."],
  ["Soccer uniforms", 4, "Logo placement review", "The mockup is useful for checking logo placement and seeing how the overall design might look before production."],
  ["Soccer uniforms", 5, "Team kit requirements", "This example demonstrates how a club might describe its preferred colours, player numbers, and custom design requirements."],
  ["Soccer uniforms", 4, "Sizing information", "Clear sizing guidance is important when planning a kit order for a group with different player sizes."],
  ["Soccer uniforms", 5, "Customization options", "A useful example of feedback about comparing artwork, colours, and personalization options for a custom team kit."],
  ["Soccer uniforms", 3, "Production information", "This sample illustrates feedback about wanting clearer production milestones and more detail when planning a larger team order.", "Demo reply: thank you — this shows how a company response appears under a review."],
  ["Goalkeeper gloves", 5, "Product specification questions", "A customer evaluating goalkeeper gloves may want clear information about available palm options, sizing, and intended use."],
  ["Goalkeeper gloves", 4, "Colour and branding", "The design process should make it easy to discuss glove colours, branding placement, and preferred specifications."],
  ["Goalkeeper gloves", 5, "Comparing glove options", "A useful example of feedback about having the available glove specifications explained before deciding which option suits a team."],
  ["Footballs", 5, "Custom football artwork", "Custom artwork and crest placement are important details when preparing footballs for a club or promotional order."],
  ["Footballs", 4, "Bulk-order planning", "For a larger football order, clear specifications and an itemized quotation help make the requirements easier to review."],
  ["Footballs", 3, "Specification clarity", "This sample highlights why buyers appreciate detailed product specifications and a clear explanation of customization options."],
  ["American football uniforms", 5, "Team identity", "Numbering, team colours, and logo placement are important considerations when planning a coordinated American football uniform."],
  ["American football uniforms", 4, "Design coordination", "A structured design review can help a team check its artwork and uniform requirements before approving a final layout."],
  ["American football uniforms", 5, "Bulk uniform requirements", "This example shows the sort of feedback a team might provide about organizing colours, sizes, and player numbers."],
  ["Hoodies", 5, "Custom hoodie branding", "Logo placement, garment colour, and personalization are useful details to review when preparing branded team hoodies."],
  ["Hoodies", 4, "Apparel specifications", "A detailed specification sheet helps buyers compare available garment options and communicate their requirements clearly."],
  ["Hoodies", 3, "Fabric details", "This example represents a buyer asking for more information about fabric composition, garment weight, and fit."],
  ["Sports bags", 5, "Team bag customization", "Custom colours, branding, and practical storage requirements are worth confirming when planning bags for an entire squad."],
  ["Sports bags", 4, "Bag specifications", "Clear information about dimensions, compartments, materials, and branding helps a buyer choose suitable team bags."],
  ["Varsity & outerwear", 5, "Jacket design options", "A design review can help clarify panel colours, logo placement, and the overall appearance of a custom jacket."],
  ["Leather jackets", 4, "Material selection", "Material descriptions and sizing details are useful when comparing different jacket styles for a group order."],
  ["Leather jackets", 3, "Additional product detail", "This sample highlights the importance of clarifying material specifications and customization details before confirming an order."],
  ["Racing suits", 5, "Racing suit customization", "Racing teams may need detailed discussions about measurements, colours, design placement, and the required suit specifications."],
  ["Motorbike suits", 4, "Measurement requirements", "Clear measurement guidance is especially important when preparing specifications for a custom-fitted motorsports garment."],
  ["Racing suits", 5, "Custom racing artwork", "A well-organized design review can help a team coordinate artwork, sponsor logos, and its preferred colour scheme."],
  ["Custom orders", 5, "Clear quotations", "An itemized quotation makes it easier to review product quantities, customization requirements, and the expected order cost."],
  ["Custom orders", 4, "Sample approval process", "Having a defined sample-approval stage helps buyers identify which design details should be confirmed before a bulk order."],
  ["Custom orders", 3, "Order update expectations", "This example illustrates why customers may value clearer progress updates and written confirmation of important production milestones."],
  ["Custom orders", 5, "Organizing a custom order", "A structured enquiry process can help customers communicate their designs, quantities, branding requirements, and preferred specifications."],
  ["Soccer uniforms", 2, "Layout test: low rating", "A two-star fixture used to check that low ratings render and count correctly in the distribution bars.", "Demo reply: sorry to hear this — this checks how a reply looks under a critical review."],
  ["Footballs", 1, "Layout test: one star", "A one-star fixture used to test the lowest end of the rating scale and the filter for critical feedback."],
  ["Goalkeeper gloves", 2, "Layout test: sizing concern", "A fixture describing a sizing concern, used to test how critical feedback about fit appears on the page."],
  ["Hoodies", 5, "Layout test: very short", "Short fixture."],
  ["Sports bags", 4, "Layout test: long review", "This deliberately long fixture checks how a review with several sentences wraps on narrow phone screens and wide desktop layouts. It mentions specifications, artwork, a sample stage and delivery planning so the card height, line length and spacing can be reviewed. It is not a real customer statement and only exists to test the layout."],
  ["Racing suits", 3, "Layout test: neutral", "A neutral three-star fixture used to check the middle of the rating distribution."],
  ["Varsity & outerwear", 4, "Layout test: outerwear filter", "A fixture used to test filtering by the varsity and outerwear category."],
  ["American football uniforms", 2, "Layout test: communication", "A fixture representing feedback about wanting faster replies, used to test critical reviews in this category."],
  ["Custom orders", 5, "Layout test: pagination", "A fixture used to fill a second page of results so pagination can be checked."],
  ["Leather jackets", 5, "Layout test: leather filter", "A fixture used to test the leather jackets category filter and its count."],
  ["Motorbike suits", 3, "Layout test: motorbike filter", "A fixture used to test the motorbike suits filter with a mid-range rating."],
  ["Footballs", 4, "Layout test: sort order", "A fixture used to test sorting by newest, highest and lowest rating."],
  ["Soccer uniforms", 5, "Layout test: reply length", "A fixture paired with a long company reply to test spacing.", "Demo reply: this is a longer company response used to check that replies wrap correctly and stay visually separate from the reviewer's own words on every screen size."],
  ["Hoodies", 1, "Layout test: empty filter", "A one-star hoodies fixture used to check the rating-filter combinations and empty states."],
  ["Custom orders", 4, "Layout test: last item", "The last fixture, used to check the end of the list and the final page of results."],
];

/** The fixtures, newest first. Only call after demoReviewsEnabled() returned true. */
export function demoReviews(now = new Date("2026-10-01T12:00:00Z")): DemoReview[] {
  return ROWS.map(([productLine, rating, title, quote, response], i) => ({
    id: `demo-${String(i + 1).padStart(2, "0")}`,
    isDemo: true,
    author: `Demo Buyer ${String(i + 1).padStart(2, "0")}`,
    title,
    quote,
    rating,
    productLine,
    verified: false,
    company: null,
    country: null,
    role: null,
    photo: null,
    response: response ?? null,
    createdAt: new Date(now.getTime() - i * 3 * 86_400_000),
  }));
}
