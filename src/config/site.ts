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
      // KNOWN FACT (client business card, 2026-10-07): product lines.
      "Custom sportswear and leather manufacturer: footballs, goalkeeper gloves, soccer and American football uniforms, motorbike and racing suits, leather and varsity jackets, hoodies, sports bags, tracksuits and gym wear. Your logo, labels, tags and packaging, made in our own factory in Sialkot, Pakistan.",
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
  { label: "Industries", href: "/industries", description: "Clubs, brands, racing teams and retailers" },
  { label: "Buyer guides", href: "/insights", description: "Fabrics, CE ratings and ordering checklists" },
  { label: "Track an order", href: "/track", description: "Check your order status" },
];

export const footerNav: { title: string; links: NavItem[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Client reviews", href: "/reviews" },
      { label: "Buyer guides", href: "/insights" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "Footballs", href: "/products/c/footballs" },
      { label: "Goalkeeper gloves", href: "/products/c/goalkeeper-gloves" },
      { label: "Soccer uniforms", href: "/products/c/sublimation-teamwear" },
      { label: "Motorbike suits", href: "/products/c/motorbike-racing-suits" },
      { label: "Hoodies", href: "/products/c/hoodies" },
      { label: "Sports bags", href: "/products/c/bags" },
      { label: "Leather jackets", href: "/products/c/leather-jackets" },
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

/**
 * Other offices, shown in the footer, on Contact, in the phone menu and to the AI chat. KNOWN FACT (owner via
 * Kaif, 2026-10-11): Italy office, Nuoro, +39 344 408 0435. The contact person's name (`person`) must NEVER be
 * shown publicly (owner, 2026-10-11); the office and its number must be (Abdullah, 2026-10-12).
 */
export const OFFICES = [{ label: "Italy office", country: "Nuoro, Italy", flag: "🇮🇹", person: "Mian Muhammad Bilal", phone: "+39 344 408 0435" }];

/** The number to call: the factory's own number once it is set in admin, otherwise the Italy office. */
export function publicPhone(settingsPhone: string): { number: string; label: string } | null {
  if (settingsPhone) return { number: settingsPhone, label: "Phone" };
  const o = OFFICES[0];
  return o ? { number: o.phone, label: `${o.label} · ${o.country}` } : null;
}

/**
 * KNOWN FACT (Abdullah, 2026-10-12): the company is led by Mian Sajid Abbas, shown as "Founder & CEO"
 * (not "Director" / "Managing Director"). Photo: client's showroom shot, cleaned of third-party marks
 * by .gstack/prep-founder.py.
 */
export const FOUNDER = { name: "Mian Sajid Abbas", title: "Founder & CEO", photo: "/media/team/sajid-abbas-founder-v1.webp" } as const;

/** KNOWN FACT (owner via Kaif, 2026-10-11): MOQ 50 pieces per design, custom pricing per order, one sample $150. */
export const ORDER_TERMS = { moq: 50, sampleCents: 15000, currency: "USD" } as const;
