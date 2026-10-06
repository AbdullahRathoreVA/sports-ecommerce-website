/**
 * Default business identity and policy.
 *
 * ─── Facts policy ─────────────────────────────────────────────────────────
 * Every field is one of:
 *   KNOWN FACT         — stated by the client.
 *   ASSUMPTION         — reasonable, reversible default.
 *   NEEDS CLIENT INPUT — left empty. The UI hides empty fields instead of
 *                        showing a guess. A supplier's phone number, lead time
 *                        or certificate is a trust signal; an invented one is
 *                        worse than none.
 *
 * These are defaults only. The live values come from the `Setting` table and
 * are edited in Admin → Content → Site settings without a deploy.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type SiteSettings = {
  brand: {
    /** ASSUMPTION — working name until the client confirms the company name. */
    name: string;
    shortName: string;
    tagline: string;
    description: string;
    /** Label printed on the client's garments in their own photos. NEEDS CLIENT INPUT to confirm. */
    houseLabel: string;
  };
  contact: {
    email: string; // NEEDS CLIENT INPUT
    phone: string; // NEEDS CLIENT INPUT
    /** Digits only, international format, e.g. 923001234567. NEEDS CLIENT INPUT */
    whatsapp: string;
    addressLine: string; // NEEDS CLIENT INPUT
    city: string; // NEEDS CLIENT INPUT
    country: string; // NEEDS CLIENT INPUT
    mapsUrl: string;
    hours: string;
    /** Shown next to forms. ASSUMPTION — a commitment the client must be able to honour. */
    responseTime: string;
  };
  social: {
    instagram: string;
    facebook: string;
    linkedin: string;
    tiktok: string;
    youtube: string;
  };
  commerce: {
    currency: string;
    /** ASSUMPTION — Stripe does not onboard Pakistani merchants; invoice-based payment is the norm for exporters. */
    paymentMethods: { id: string; label: string; detail: string }[];
    shippingNote: string;
    sampleNote: string;
  };
  /** Published only once the client confirms each number. Empty = hidden. */
  facts: {
    founded: string;
    teamSize: string;
    monthlyCapacity: string;
    exportMarkets: string;
  };
  /** Demo banner + "placeholder" labels. Turn off at go-live. */
  demoMode: boolean;
};

export const defaultSettings: SiteSettings = {
  brand: {
    // KNOWN FACT (client, 2026-10-07): trading name is Alrobel Sportswear.
    name: "Alrobel Sportswear",
    shortName: "Alrobel",
    tagline: "Custom sportswear manufacturer",
    description:
      "Manufacturer and wholesaler of sublimated teamwear, leather racing suits, leather jackets, American-football gloves and sportswear — made in our own factory in Sialkot, Pakistan, under your label or ours.",
    houseLabel: "",
  },
  contact: {
    email: "",
    phone: "",
    whatsapp: "",
    // KNOWN FACT (client business card, 2026-10-07).
    addressLine: "Gohadpur",
    // KNOWN FACT (client, 2026-10-05): the factory is in Sialkot, Pakistan.
    city: "Sialkot",
    country: "Pakistan",
    mapsUrl: "",
    hours: "",
    responseTime: "We reply to every enquiry within one working day.",
  },
  social: { instagram: "", facebook: "", linkedin: "", tiktok: "", youtube: "" },
  commerce: {
    currency: "USD",
    paymentMethods: [
      {
        id: "bank_transfer",
        label: "Bank transfer (T/T)",
        detail: "We confirm your order and email a proforma invoice with bank details.",
      },
      {
        id: "invoice_link",
        label: "Card / PayPal via invoice link",
        detail: "We email a secure payment link once your order is confirmed.",
      },
    ],
    shippingNote:
      "Freight is quoted after confirmation, based on weight, destination and service (air, sea or express courier).",
    sampleNote: "Sample cost is confirmed with your quote.",
  },
  // exportMarkets: client's own claim from their business card (2026-10-07).
  facts: { founded: "", teamSize: "", monthlyCapacity: "", exportMarkets: "20+ countries" },
  demoMode: true,
};

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export type NavItem = { label: string; href: string; description?: string };

export const primaryNav: NavItem[] = [
  { label: "Products", href: "/products" },
  { label: "Custom Orders", href: "/oem" },
  { label: "Design Studio", href: "/design-studio" },
  { label: "Contact", href: "/contact" },
];

/** "Company" dropdown in the header. */
export const companyNav: NavItem[] = [
  { label: "About us", href: "/about", description: "Who we are and how we work" },
  { label: "Our factory", href: "/factory", description: "Printing, cutting, stitching and QC in Sialkot" },
  { label: "Industries", href: "/industries", description: "Clubs, brands, racing teams and retailers" },
  { label: "Buyer guides", href: "/insights", description: "Fabrics, CE ratings and ordering checklists" },
  { label: "Track an order", href: "/track", description: "Check your order status" },
];

export const footerNav: { title: string; links: NavItem[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Our factory", href: "/factory" },
      { label: "Buyer guides", href: "/insights" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "Sublimation teamwear", href: "/products/c/sublimation-teamwear" },
      { label: "Racing suits", href: "/products/c/motorbike-racing-suits" },
      { label: "Leather jackets", href: "/products/c/leather-jackets" },
      { label: "Gloves", href: "/products/c/gloves" },
      { label: "Sportswear", href: "/products/c/sportswear" },
      { label: "All products", href: "/products" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Custom orders / OEM", href: "/oem" },
      { label: "Design Studio", href: "/design-studio" },
      { label: "Request a quote", href: "/quote" },
      { label: "Industries", href: "/industries" },
      { label: "Track an order", href: "/track" },
    ],
  },
];
