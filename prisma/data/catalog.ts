/**
 * Seed catalogue.
 *
 * Imagery
 *   source "client"      — the factory's own photos (sublimation teamwear).
 *   source "placeholder" — generated studio renders, standing in until the
 *                          factory photographs the line. Admin shows a badge.
 *
 * Numbers
 *   Prices, MOQs and lead times are DEMO VALUES so the cart, tiers and admin
 *   can be reviewed end to end. Every product is `isDemo: true`; the client
 *   confirms or edits each one in Admin → Products before go-live.
 *
 * Copy
 *   Describes capability shown in the factory's own footage (sublimation
 *   printing, heat-press transfer, embroidery, stitching, packing) and general
 *   product knowledge. No certification is claimed anywhere.
 */

export type SeedImage = { url: string; alt: string; width: number; height: number; source: "client" | "placeholder" };

export type SeedProduct = {
  slug: string;
  sku: string;
  name: string;
  subtitle: string;
  category: string;
  status: "ACTIVE" | "DRAFT";
  featured?: boolean;
  purchaseMode: "QUOTE" | "CART" | "BOTH";
  priceTiers: { minQty: number; unitCents: number }[];
  samplePriceCents?: number;
  moq: number;
  leadTimeMinDays?: number;
  leadTimeMaxDays?: number;
  summary: string;
  description: string;
  specs: { label: string; value: string }[];
  materials: string[];
  customizations: string[];
  features: string[];
  sizes: string[];
  colors: { name: string; hex: string }[];
  tags: string[];
  useCases: string[];
  images: SeedImage[];
  seoTitle?: string;
  seoDesc?: string;
};

export type SeedCategory = {
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  image: string;
  imageAlt: string;
  position: number;
  seoTitle: string;
  seoDesc: string;
};

const W = (url: string, alt: string, width = 1200, height = 1600): SeedImage => ({
  url,
  alt,
  width,
  height,
  source: "client",
});
const P = (url: string, alt: string): SeedImage => ({ url, alt, width: 928, height: 1152, source: "placeholder" });

const TEAM_SIZES = ["YXS", "YS", "YM", "YL", "S", "M", "L", "XL", "2XL", "3XL"];
const ADULT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const SUIT_SIZES = ["46", "48", "50", "52", "54", "56", "58", "Made to measure"];

export const categories: SeedCategory[] = [
  {
    slug: "sublimation-teamwear",
    name: "Sublimation Teamwear",
    shortName: "Teamwear",
    tagline: "Full-colour kits, printed in our own print room",
    description:
      "Football kits, goalkeeper kits and match jerseys printed edge to edge on our own large-format sublimation printers and transferred on our own heat presses. Crests, sponsors, names and numbers are part of the fabric, so they don't crack, peel or fade in the wash.",
    image: "/media/work/royal-saints-trio.webp",
    imageAlt: "Three sublimated football kits in blue, black-and-gold and pink laid out on turf",
    position: 1,
    seoTitle: "Custom Sublimated Football Kits & Teamwear Manufacturer",
    seoDesc:
      "Factory-direct sublimated football kits, goalkeeper kits and match jerseys with names, numbers, crests and sponsors printed in-house. Request a quote.",
  },
  {
    slug: "motorbike-racing-suits",
    name: "Motorbike Racing Suits",
    shortName: "Moto suits",
    tagline: "One- and two-piece leathers, built to your spec",
    description:
      "One-piece and two-piece leather suits for track days, racing and road riding, in standard sizes or made to measure. Panels, colours, perforation, armour pockets, sliders and branding are specified per order.",
    image: "/media/products/race-suit-1pc.webp",
    imageAlt: "Black, crimson and white one-piece motorcycle racing leather suit",
    position: 2,
    seoTitle: "Custom Motorbike Leather Racing Suits — OEM Manufacturer",
    seoDesc:
      "One-piece and two-piece motorcycle leather racing suits made to standard sizes or measurements, in your colours and under your label.",
  },
  {
    slug: "car-kart-racing-suits",
    name: "Car & Kart Racing Suits",
    shortName: "Race suits",
    tagline: "Team overalls in your colours",
    description:
      "Karting suits and car racing overalls cut for the seated driving position, in your team colours with sponsor placements. Fire-resistant fabrics and homologated versions are quoted only where certification can be documented.",
    image: "/media/products/kart-suit.webp",
    imageAlt: "Fluorescent yellow and black one-piece karting suit",
    position: 3,
    seoTitle: "Custom Kart & Car Racing Suits Manufacturer",
    seoDesc: "Custom karting suits and car racing overalls in your team colours, with sponsor logos. Request a quote.",
  },
  {
    slug: "leather-jackets",
    name: "Leather Jackets",
    shortName: "Jackets",
    tagline: "Biker, café racer and custom cuts",
    description:
      "Leather jackets cut, stitched and finished to your pattern or ours. Leather type, finish, lining, hardware and labels are chosen per order, from a single sample to a full retail range.",
    image: "/media/products/biker-jacket.webp",
    imageAlt: "Black leather biker jacket with silver hardware",
    position: 4,
    seoTitle: "Leather Jacket Manufacturer — Private Label & Wholesale",
    seoDesc: "Biker and custom leather jackets made to your pattern and label. Wholesale and private-label production.",
  },
  {
    slug: "gloves",
    name: "Gloves",
    shortName: "Gloves",
    tagline: "American football, motorbike and racing gloves",
    description:
      "Receiver and lineman gloves for American football, plus motorbike and racing gloves, in your colours with your logo on the back of hand, cuff or palm.",
    image: "/media/products/af-gloves.webp",
    imageAlt: "Pair of black and cobalt American football receiver gloves",
    position: 5,
    seoTitle: "Custom American Football & Racing Gloves Manufacturer",
    seoDesc: "Custom American football receiver and lineman gloves, motorbike and racing gloves with your logo. Factory-direct.",
  },
  {
    slug: "sportswear",
    name: "Sportswear",
    shortName: "Sportswear",
    tagline: "Tracksuits, hoodies and training wear",
    description:
      "Tracksuits, hoodies and training wear for teams, gyms and private-label brands, with embroidered or printed branding.",
    image: "/media/products/tracksuit.webp",
    imageAlt: "Navy tracksuit with cobalt side panels",
    position: 6,
    seoTitle: "Custom Sportswear & Tracksuit Manufacturer",
    seoDesc: "Custom tracksuits, hoodies and training wear with embroidered or printed branding. Private label available.",
  },
];

const KIT_SPECS = [
  { label: "Print method", value: "Full-colour dye sublimation, edge to edge" },
  { label: "Fabric options", value: "Polyester interlock, birdseye mesh or micro-mesh — weight confirmed with quote" },
  { label: "Set", value: "Shirt + shorts; matching socks optional" },
  { label: "Necklines", value: "Crew, V-neck or collared" },
  { label: "Decoration", value: "Crest, sponsors, names and numbers printed; embroidered crest optional" },
  { label: "Labels", value: "Custom neck tape, size labels and hang tags available" },
];

const KIT_CUSTOM = [
  "Fully custom design",
  "Player names & numbers",
  "Sponsor logos",
  "Embroidered crest",
  "Custom neck tape & labels",
  "Individual polybag packing",
];

export const products: SeedProduct[] = [
  // ─── Sublimation teamwear (factory photography) ──────────────────────────
  {
    slug: "custom-sublimated-football-kit",
    sku: "GL-TW-101",
    name: "Custom Sublimated Football Kit",
    subtitle: "Shirt, shorts and socks — your design, printed in-house",
    category: "sublimation-teamwear",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 3800 },
      { minQty: 10, unitCents: 1900 },
      { minQty: 25, unitCents: 1550 },
      { minQty: 50, unitCents: 1350 },
      { minQty: 100, unitCents: 1190 },
    ],
    samplePriceCents: 3800,
    moq: 10,
    leadTimeMinDays: 14,
    leadTimeMaxDays: 21,
    summary:
      "A complete match kit printed edge to edge with your crest, sponsors, names and numbers. Designed with you, printed on our own sublimation line and stitched in our own factory.",
    description:
      "Send us your crest and colours, a reference kit or just an idea. We prepare the artwork, print it on transfer paper on our large-format sublimation printers, then press the colour into the fabric on our heat presses before cutting and stitching.\n\nBecause the ink becomes part of the polyester fibre, sublimated graphics don't crack or peel and keep their colour wash after wash. That also means there's no extra cost for complex designs, gradients or full-body patterns.\n\nEvery player's name and number is printed into the same panel, so a full squad arrives sorted, labelled and ready for match day.",
    specs: KIT_SPECS,
    materials: ["Polyester interlock", "Birdseye mesh", "Micro-mesh"],
    customizations: KIT_CUSTOM,
    features: [
      "Unlimited colours at no extra cost",
      "Names and numbers per player",
      "Graphics won't crack or peel",
      "Lightweight, breathable fabric",
    ],
    sizes: TEAM_SIZES,
    colors: [
      { name: "Any colour", hex: "#2f54ff" },
    ],
    tags: ["football", "soccer", "kit", "jersey", "sublimation", "club", "team"],
    useCases: ["clubs", "schools", "leagues", "academies", "corporate"],
    images: [
      W("/media/work/royal-saints-blue.webp", "Blue sublimated football kit with sponsor logo, shorts and socks laid on turf"),
      W("/media/work/royal-saints-blue-back.webp", "Back of a blue sublimated football shirt printed with ROYAL SAINTS and number 3", 1362, 1600),
      W("/media/work/detail-crest.webp", "Close-up of a printed club crest and neck tape on a blue sublimated shirt"),
      W("/media/work/royal-saints-trio.webp", "Three sublimated football kits in blue, black-and-gold and pink"),
    ],
    seoTitle: "Custom Sublimated Football Kits — Factory Direct",
    seoDesc:
      "Custom sublimated football kits with crest, sponsors, names and numbers printed in-house. Samples available, bulk pricing from 10 sets.",
  },
  {
    slug: "long-sleeve-goalkeeper-kit",
    sku: "GL-TW-102",
    name: "Long-Sleeve Goalkeeper Kit",
    subtitle: "Bold all-over prints that stand apart from the outfield",
    category: "sublimation-teamwear",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 4200 },
      { minQty: 5, unitCents: 2400 },
      { minQty: 25, unitCents: 1950 },
      { minQty: 50, unitCents: 1700 },
    ],
    samplePriceCents: 4200,
    moq: 5,
    leadTimeMinDays: 14,
    leadTimeMaxDays: 21,
    summary:
      "A long-sleeve goalkeeper shirt with matching shorts and socks, printed all over in marble, camo, split or any pattern you can draw.",
    description:
      "Goalkeepers need to be unmistakable. Sublimation lets us print any pattern edge to edge — marble swirls, split colourways, camo, gradients — at no extra cost over a plain shirt.\n\nKits are made to order alongside your outfield kits so colours, crests and sponsor placements match across the squad.",
    specs: [...KIT_SPECS.slice(0, 2), { label: "Sleeves", value: "Long sleeve; padded elbows on request" }, ...KIT_SPECS.slice(3)],
    materials: ["Polyester interlock", "Micro-mesh"],
    customizations: KIT_CUSTOM,
    features: ["All-over patterns at no extra cost", "Matches your outfield kit", "Long sleeves for protection"],
    sizes: TEAM_SIZES,
    colors: [{ name: "Any colour", hex: "#16a34a" }],
    tags: ["goalkeeper", "keeper", "long sleeve", "football", "kit", "sublimation"],
    useCases: ["clubs", "academies", "schools", "leagues"],
    images: [
      W("/media/work/rjc-goalkeeper.webp", "Green long-sleeve goalkeeper kit with a speckled pattern, shorts and socks"),
      W("/media/work/royal-saints-marble.webp", "Black-and-gold marble pattern long-sleeve goalkeeper kit"),
      W("/media/work/royal-saints-marble-back.webp", "Back of a split gold and black goalkeeper shirt with ROYAL SAINTS and number 1"),
    ],
  },
  {
    slug: "striped-match-kit",
    sku: "GL-TW-103",
    name: "Striped Match Kit",
    subtitle: "Classic stripes, printed — not stitched",
    category: "sublimation-teamwear",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 3800 },
      { minQty: 10, unitCents: 1950 },
      { minQty: 25, unitCents: 1600 },
      { minQty: 50, unitCents: 1400 },
    ],
    samplePriceCents: 3800,
    moq: 10,
    leadTimeMinDays: 14,
    leadTimeMaxDays: 21,
    summary:
      "Traditional vertical stripes with crest and sponsor, printed in one piece so the stripes line up perfectly across every seam.",
    description:
      "Stripes look simple but are hard to get right when they're cut and sewn from separate fabrics. Printing them into the panel keeps every stripe crisp and aligned, and lets you choose any stripe width, colour or fade.\n\nAvailable in any colour pair, with short or long sleeves and matching shorts and socks.",
    specs: KIT_SPECS,
    materials: ["Polyester interlock", "Birdseye mesh"],
    customizations: KIT_CUSTOM,
    features: ["Stripes aligned across seams", "Any stripe width or colour", "Short or long sleeve"],
    sizes: TEAM_SIZES,
    colors: [{ name: "Any colour pair", hex: "#b91c1c" }],
    tags: ["stripes", "football", "kit", "classic", "sublimation"],
    useCases: ["clubs", "schools", "leagues"],
    images: [
      W("/media/work/rjc-stripes.webp", "Blue and white striped football kit with shorts and socks"),
      W("/media/work/platinum-stripes.webp", "Red and white striped football shirt with matching shorts and socks"),
      W("/media/work/stripes-trio.webp", "Three striped and patterned football kits laid out together"),
    ],
  },
  {
    slug: "club-kit-pack",
    sku: "GL-TW-104",
    name: "Club Kit Pack — Home, Away & Third",
    subtitle: "One design language, three colourways",
    category: "sublimation-teamwear",
    status: "ACTIVE",
    featured: false,
    purchaseMode: "QUOTE",
    priceTiers: [{ minQty: 30, unitCents: 1450 }],
    moq: 30,
    leadTimeMinDays: 18,
    leadTimeMaxDays: 28,
    summary:
      "A full season's kit programme designed together: home, away and third (or goalkeeper) kits sharing one crest, sponsor layout and template.",
    description:
      "Clubs ordering several kits at once get a consistent look and better pricing. We design the three colourways together, produce one approval sample of each and then run all three in a single production slot.\n\nPricing is per set across the whole pack, so mixed quantities per colour are welcome.",
    specs: [...KIT_SPECS, { label: "Programme", value: "Home + away + third/goalkeeper, one approval sample each" }],
    materials: ["Polyester interlock", "Birdseye mesh", "Micro-mesh"],
    customizations: KIT_CUSTOM,
    features: ["Designed as a set", "One production slot", "Pack pricing across colourways"],
    sizes: TEAM_SIZES,
    colors: [{ name: "Three colourways", hex: "#facc15" }],
    tags: ["club", "pack", "home", "away", "third", "season"],
    useCases: ["clubs", "leagues", "academies"],
    images: [
      W("/media/work/ovamill-trio.webp", "Green, pink and yellow versions of the same club kit laid out on turf", 1600, 1200),
      W("/media/work/ovamill-yellow.webp", "Yellow and black sublimated shirt with sponsor and matching black shorts"),
      W("/media/work/ovamill-green.webp", "Bright green sublimated shirt with sponsor print"),
      W("/media/work/ovamill-pink.webp", "Pink long-sleeve sublimated shirt with tonal pattern and matching shorts", 1290, 1600),
    ],
  },
  {
    slug: "pro-fit-match-jersey",
    sku: "GL-TW-105",
    name: "Pro-Fit Match Jersey",
    subtitle: "Athletic cut with contrast collar and cuffs",
    category: "sublimation-teamwear",
    status: "ACTIVE",
    featured: false,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 2600 },
      { minQty: 10, unitCents: 1250 },
      { minQty: 50, unitCents: 990 },
      { minQty: 100, unitCents: 860 },
    ],
    samplePriceCents: 2600,
    moq: 10,
    leadTimeMinDays: 12,
    leadTimeMaxDays: 18,
    summary:
      "A slimmer athletic-cut jersey with contrast rib collar and cuffs — hoops, chevrons or solid, printed with your sponsor and numbers.",
    description:
      "The pro-fit pattern sits closer to the body for a sharper look on the pitch. Rib collar and cuffs are dyed to match your palette, and the body is fully sublimated, so hoops, chevrons and sponsor blocks cost the same as a plain shirt.",
    specs: [
      { label: "Print method", value: "Full-colour dye sublimation" },
      { label: "Fit", value: "Athletic (pro) cut" },
      { label: "Collar & cuffs", value: "Contrast rib, colour-matched" },
      { label: "Fabric options", value: "Polyester interlock or micro-mesh — weight confirmed with quote" },
    ],
    materials: ["Polyester interlock", "Micro-mesh"],
    customizations: ["Fully custom design", "Player names & numbers", "Sponsor logos", "Custom neck tape & labels"],
    features: ["Athletic fit", "Contrast rib trims", "Any pattern at no extra cost"],
    sizes: TEAM_SIZES,
    colors: [{ name: "Any colour", hex: "#ea580c" }],
    tags: ["jersey", "shirt", "pro fit", "football", "sublimation"],
    useCases: ["clubs", "brands", "corporate", "leagues"],
    images: [
      W("/media/work/purity-front.webp", "Blue and white hooped jersey with red shorts on a mannequin"),
      W("/media/work/purity-back.webp", "Back of a blue jersey printed PURITY BAKERIES, number 3 and player name"),
      W("/media/work/tfc-orange.webp", "Orange sublimated match jersey with sponsor and red shorts on a mannequin", 1006, 1600),
    ],
  },

  // ─── Motorbike racing suits (placeholder renders) ────────────────────────
  {
    slug: "one-piece-leather-race-suit",
    sku: "GL-MR-201",
    name: "One-Piece Leather Race Suit",
    subtitle: "Track-cut leathers in your colours",
    category: "motorbike-racing-suits",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 52000 },
      { minQty: 5, unitCents: 38000 },
      { minQty: 10, unitCents: 34000 },
      { minQty: 25, unitCents: 31000 },
    ],
    samplePriceCents: 52000,
    moq: 5,
    leadTimeMinDays: 25,
    leadTimeMaxDays: 35,
    summary:
      "A one-piece leather suit pre-curved for the riding position, with stretch panels, knee sliders, armour pockets and an aero hump — in your design, standard sizes or made to measure.",
    description:
      "We cut each suit from a full set of leather panels, stitched in multiple rows at the high-abrasion zones and lined for comfort. Stretch panels at the knees, back and arms let you tuck in on the bike without fighting the leather.\n\nEvery panel colour, perforation zone and logo position is specified per order. For riders who want an exact fit, we send a measurement guide and cut to your numbers.\n\nArmour pockets take shoulder, elbow, knee and hip protectors. Protection ratings depend on the armour fitted and on garment testing, so certification is confirmed per order with documents — never assumed.",
    specs: [
      { label: "Leather", value: "Cowhide or kangaroo options — thickness confirmed with quote" },
      { label: "Construction", value: "One piece, pre-curved riding position" },
      { label: "Stretch zones", value: "Knees, lower back, arms and crotch" },
      { label: "Protection", value: "Pockets for shoulder, elbow, knee and hip armour; back protector pocket" },
      { label: "Sliders", value: "Replaceable knee sliders; elbow sliders optional" },
      { label: "Fit", value: "Standard EU sizes or made to measure" },
      { label: "Certification", value: "Confirmed per order with documents" },
    ],
    materials: ["Cowhide leather", "Kangaroo leather (option)", "Aramid stretch panels"],
    customizations: [
      "Panel colours & layout",
      "Perforation zones",
      "Embroidered or printed logos",
      "Name & race number",
      "Made to measure",
      "Private label",
    ],
    features: ["Pre-curved riding fit", "Aero hump", "Multi-row stitching in impact zones", "Replaceable knee sliders"],
    sizes: SUIT_SIZES,
    colors: [
      { name: "Black / crimson / white", hex: "#9f1239" },
      { name: "Custom", hex: "#2f54ff" },
    ],
    tags: ["motorbike", "motorcycle", "leathers", "track", "race suit", "one piece"],
    useCases: ["riders", "racing-teams", "brands", "retailers"],
    images: [
      P("/media/products/race-suit-1pc.webp", "One-piece motorcycle racing leather suit in black, crimson and white"),
      P("/media/products/race-suit-back.webp", "Back of the one-piece race suit showing the aero hump and stretch panels"),
    ],
    seoTitle: "Custom One-Piece Motorcycle Leather Race Suit",
    seoDesc:
      "Custom one-piece motorbike racing leathers in your colours, standard sizes or made to measure. Samples available, bulk pricing for teams and brands.",
  },
  {
    slug: "two-piece-leather-suit",
    sku: "GL-MR-202",
    name: "Two-Piece Leather Suit",
    subtitle: "Jacket and trousers that zip together for the track",
    category: "motorbike-racing-suits",
    status: "ACTIVE",
    featured: false,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 46000 },
      { minQty: 5, unitCents: 33000 },
      { minQty: 10, unitCents: 29500 },
      { minQty: 25, unitCents: 27000 },
    ],
    samplePriceCents: 46000,
    moq: 5,
    leadTimeMinDays: 25,
    leadTimeMaxDays: 35,
    summary:
      "A leather jacket and trousers joined by a full-circumference zip — wear it as one suit on track, or the jacket alone on the road.",
    description:
      "Two-piece suits suit riders who switch between track days and road riding. The connecting zip turns the pair into a single suit; separated, the jacket works on its own.\n\nPanels, perforation, armour pockets and branding are specified per order, exactly like our one-piece suits.",
    specs: [
      { label: "Leather", value: "Cowhide — thickness confirmed with quote" },
      { label: "Construction", value: "Jacket + trousers, full-circumference connecting zip" },
      { label: "Protection", value: "Armour pockets at shoulders, elbows, knees and hips" },
      { label: "Sliders", value: "Replaceable knee sliders" },
      { label: "Fit", value: "Standard EU sizes or made to measure" },
      { label: "Certification", value: "Confirmed per order with documents" },
    ],
    materials: ["Cowhide leather", "Aramid stretch panels"],
    customizations: ["Panel colours & layout", "Embroidered or printed logos", "Name & race number", "Made to measure", "Private label"],
    features: ["Wear together or apart", "Connecting zip", "Replaceable knee sliders"],
    sizes: SUIT_SIZES,
    colors: [
      { name: "White / cobalt / black", hex: "#2f54ff" },
      { name: "Custom", hex: "#0b0c0e" },
    ],
    tags: ["motorbike", "motorcycle", "two piece", "leathers", "track", "road"],
    useCases: ["riders", "racing-teams", "brands", "retailers"],
    images: [P("/media/products/race-suit-2pc.webp", "Two-piece white, blue and black motorcycle leather suit")],
  },

  // ─── Car & kart (placeholder renders) ────────────────────────────────────
  {
    slug: "kart-racing-suit",
    sku: "GL-KR-301",
    name: "Kart Racing Suit",
    subtitle: "Lightweight, abrasion-resistant team overalls",
    category: "car-kart-racing-suits",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 12000 },
      { minQty: 10, unitCents: 7200 },
      { minQty: 25, unitCents: 6400 },
      { minQty: 50, unitCents: 5800 },
    ],
    samplePriceCents: 12000,
    moq: 10,
    leadTimeMinDays: 18,
    leadTimeMaxDays: 25,
    summary:
      "A one-piece karting suit in coated technical fabric, padded at the ribs, with your team colours and sponsor logos.",
    description:
      "Karting suits take abrasion on the slides and constant movement in the seat. We cut them for the seated position with padded rib panels and soft collars, and decorate them with printed or embroidered sponsor logos.\n\nSuits intended for sanctioned competition may need homologation; tell us your series and we'll confirm what's available before you order.",
    specs: [
      { label: "Fabric", value: "Coated abrasion-resistant technical fabric — confirmed with quote" },
      { label: "Construction", value: "One piece, cut for the seated position" },
      { label: "Padding", value: "Rib panels" },
      { label: "Branding", value: "Printed or embroidered sponsor logos" },
      { label: "Homologation", value: "Confirmed per series and order" },
    ],
    materials: ["Coated technical fabric"],
    customizations: ["Team colours", "Sponsor logos", "Driver name & flag", "Private label"],
    features: ["Seated-position cut", "Padded rib panels", "Sponsor-ready layout"],
    sizes: ["Kids 120", "Kids 130", "Kids 140", "Kids 150", ...ADULT_SIZES],
    colors: [
      { name: "Fluo yellow / black", hex: "#d9f99d" },
      { name: "Custom", hex: "#2f54ff" },
    ],
    tags: ["kart", "karting", "race suit", "overall", "motorsport"],
    useCases: ["racing-teams", "riders", "clubs", "brands"],
    images: [P("/media/products/kart-suit.webp", "Fluorescent yellow and black one-piece karting suit")],
  },
  {
    slug: "car-racing-suit",
    sku: "GL-KR-302",
    name: "Car Racing Suit",
    subtitle: "Team overalls with epaulettes and stretch panels",
    category: "car-kart-racing-suits",
    status: "ACTIVE",
    featured: false,
    purchaseMode: "QUOTE",
    priceTiers: [],
    moq: 5,
    leadTimeMinDays: 25,
    leadTimeMaxDays: 40,
    summary:
      "A one-piece driver suit with shoulder epaulettes, stretch panels and knitted cuffs, built in your team livery.",
    description:
      "Driver suits are quoted individually because the fabric — and whether a suit needs fire-resistance certification for your series — changes everything about the build.\n\nTell us the championship, quantity and livery. We'll come back with the fabric options available and, where a homologated suit is required, only quote what we can document.",
    specs: [
      { label: "Construction", value: "One piece with belted waist" },
      { label: "Details", value: "Shoulder epaulettes, stretch arm and back panels, knitted cuffs and collar" },
      { label: "Fabric", value: "Quoted per series requirement" },
      { label: "Homologation", value: "Only quoted where certification can be documented" },
    ],
    materials: ["Quoted per requirement"],
    customizations: ["Team livery", "Sponsor logos", "Driver name & flag", "Made to measure"],
    features: ["Shoulder epaulettes", "Stretch panels", "Belted waist"],
    sizes: [...ADULT_SIZES, "Made to measure"],
    colors: [
      { name: "Deep red / white", hex: "#991b1b" },
      { name: "Custom", hex: "#2f54ff" },
    ],
    tags: ["car racing", "driver suit", "motorsport", "overall", "team"],
    useCases: ["racing-teams", "brands"],
    images: [P("/media/products/car-race-suit.webp", "Deep red one-piece car racing driver suit with white stripes")],
  },

  // ─── Leather jackets ─────────────────────────────────────────────────────
  {
    slug: "classic-biker-leather-jacket",
    sku: "GL-LJ-401",
    name: "Classic Biker Leather Jacket",
    subtitle: "Asymmetric zip, belted waist, full-grain leather",
    category: "leather-jackets",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 16500 },
      { minQty: 10, unitCents: 9800 },
      { minQty: 25, unitCents: 8600 },
      { minQty: 50, unitCents: 7900 },
    ],
    samplePriceCents: 16500,
    moq: 10,
    leadTimeMinDays: 20,
    leadTimeMaxDays: 30,
    summary:
      "The original biker silhouette — asymmetric zip, snap lapels, zipped cuffs and a belted waist — made to your spec and label.",
    description:
      "A wardrobe staple for retailers and private-label brands. Choose the leather, finish, lining, hardware colour and label, and we'll cut a sample for approval before the run.\n\nAvailable in men's and women's patterns, with your woven label, printed lining and branded hardware on larger runs.",
    specs: [
      { label: "Leather", value: "Cowhide, sheepskin or goatskin — confirmed with quote" },
      { label: "Lining", value: "Quilted or plain; printed lining available" },
      { label: "Hardware", value: "Silver, gunmetal or antique brass" },
      { label: "Fits", value: "Men's and women's patterns" },
      { label: "Branding", value: "Woven labels, embossed patches, branded zip pulls" },
    ],
    materials: ["Cowhide", "Sheepskin", "Goatskin"],
    customizations: ["Leather & finish", "Lining", "Hardware colour", "Private label", "Custom pattern"],
    features: ["Asymmetric front zip", "Snap lapels", "Zipped cuffs", "Belted waist"],
    sizes: ADULT_SIZES,
    colors: [
      { name: "Black", hex: "#111111" },
      { name: "Brown", hex: "#5b3a24" },
    ],
    tags: ["leather jacket", "biker", "perfecto", "fashion", "private label"],
    useCases: ["retailers", "brands", "riders"],
    images: [
      P("/media/products/biker-jacket.webp", "Black leather biker jacket with asymmetric zip and belted waist"),
      P("/media/products/biker-jacket-detail.webp", "Close-up of the biker jacket lapel snap, zip and double-row stitching"),
    ],
  },

  // ─── Gloves ──────────────────────────────────────────────────────────────
  {
    slug: "american-football-receiver-gloves",
    sku: "GL-GV-501",
    name: "American Football Receiver Gloves",
    subtitle: "Tacky grip palms, your logo on the back",
    category: "gloves",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 2600 },
      { minQty: 50, unitCents: 980 },
      { minQty: 200, unitCents: 820 },
      { minQty: 500, unitCents: 710 },
    ],
    samplePriceCents: 2600,
    moq: 50,
    leadTimeMinDays: 20,
    leadTimeMaxDays: 30,
    summary:
      "Lightweight receiver gloves with silicone grip palms and a breathable back, in team colours with your logo.",
    description:
      "Receiver gloves live or die by grip and fit. We build them with tacky silicone grip palms, a stretch back for a close fit and an adjustable wrist tab, then decorate them in your team colours.\n\nLogos can go on the back of hand, the palm (as a grip print) or the wrist tab. Pairs are packed per size and colour, ready for distribution.",
    specs: [
      { label: "Palm", value: "Tacky silicone grip" },
      { label: "Back", value: "Stretch knit with knuckle detail" },
      { label: "Closure", value: "Adjustable wrist tab" },
      { label: "Branding", value: "Back-of-hand, palm grip print or wrist tab" },
      { label: "Packing", value: "Paired, sorted by size and colour" },
    ],
    materials: ["Silicone grip palm", "Stretch knit back"],
    customizations: ["Team colours", "Logo on back / palm / wrist", "Custom packaging", "Private label"],
    features: ["Tacky grip palms", "Close stretch fit", "Adjustable wrist tab"],
    sizes: ["Youth S", "Youth M", "Youth L", "S", "M", "L", "XL", "2XL", "3XL"],
    colors: [
      { name: "Black / cobalt", hex: "#1e3a8a" },
      { name: "Custom", hex: "#2f54ff" },
    ],
    tags: ["american football", "nfl", "receiver", "gloves", "grip", "gridiron"],
    useCases: ["clubs", "schools", "brands", "retailers"],
    images: [
      P("/media/products/af-gloves.webp", "Pair of black and cobalt American football receiver gloves showing grip palm and back"),
      P("/media/products/af-gloves-palm.webp", "Receiver glove palm with tacky silicone grip texture"),
    ],
    seoTitle: "Custom American Football Receiver Gloves — OEM",
    seoDesc: "Custom American football receiver gloves with grip palms and your logo. Bulk pricing from 50 pairs, samples available.",
  },

  // ─── Further lines (placeholder renders until factory photos arrive) ─────
  {
    slug: "cafe-racer-leather-jacket",
    sku: "GL-LJ-402",
    name: "Café Racer Leather Jacket",
    subtitle: "Band collar, clean lines, waxed leather",
    category: "leather-jackets",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 15500 },
      { minQty: 10, unitCents: 9200 },
      { minQty: 25, unitCents: 8200 },
    ],
    samplePriceCents: 15500,
    moq: 10,
    leadTimeMinDays: 20,
    leadTimeMaxDays: 30,
    summary: "A minimal café racer with a snap-tab band collar, straight zip and waxed leather that ages with wear.",
    description:
      "Clean, minimal and timeless. The café racer's short band collar and straight zip make it the most versatile leather jacket in a range. Choose leather, finish, lining and hardware per order.",
    specs: [
      { label: "Leather", value: "Waxed cowhide or sheepskin — confirmed with quote" },
      { label: "Collar", value: "Band collar with snap tab" },
      { label: "Hardware", value: "Antique brass, silver or gunmetal" },
    ],
    materials: ["Cowhide", "Sheepskin"],
    customizations: ["Leather & finish", "Lining", "Hardware colour", "Private label"],
    features: ["Band collar", "Straight front zip", "Zipped chest pocket"],
    sizes: ADULT_SIZES,
    colors: [{ name: "Tan brown", hex: "#7c4a26" }],
    tags: ["leather jacket", "cafe racer", "fashion"],
    useCases: ["retailers", "brands"],
    images: [P("/media/products/cafe-racer-jacket.webp", "Brown waxed café racer leather jacket with band collar and brass zips")],
  },
  {
    slug: "motorbike-racing-gauntlet-gloves",
    sku: "GL-GV-502",
    name: "Motorbike Racing Gauntlet Gloves",
    subtitle: "Hard knuckles, palm sliders, long cuff",
    category: "gloves",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 6500 },
      { minQty: 20, unitCents: 3400 },
      { minQty: 100, unitCents: 2800 },
    ],
    samplePriceCents: 6500,
    moq: 20,
    leadTimeMinDays: 20,
    leadTimeMaxDays: 30,
    summary: "Leather racing gauntlets with hard knuckle protection, finger and palm sliders and a double wrist closure.",
    description:
      "Built to match your race suits, in the same leather colours and branding. Protection ratings depend on the components fitted and testing, and are confirmed per order with documents.",
    specs: [
      { label: "Leather", value: "Cowhide or kangaroo palm — confirmed with quote" },
      { label: "Protection", value: "Hard knuckle, finger and palm sliders" },
      { label: "Cuff", value: "Long gauntlet, double closure" },
      { label: "Certification", value: "Confirmed per order with documents" },
    ],
    materials: ["Cowhide", "Kangaroo palm (option)"],
    customizations: ["Colours to match your suit", "Logo placement", "Private label"],
    features: ["Hard knuckle", "Palm slider", "Gauntlet cuff"],
    sizes: ["S", "M", "L", "XL", "2XL"],
    colors: [{ name: "Black / red", hex: "#991b1b" }],
    tags: ["motorbike", "gloves", "racing", "leather"],
    useCases: ["riders", "racing-teams", "brands", "retailers"],
    images: [P("/media/products/moto-racing-gloves.webp", "Black and red leather motorcycle gauntlet gloves with carbon knuckle protection")],
  },
  {
    slug: "american-football-lineman-gloves",
    sku: "GL-GV-503",
    name: "American Football Lineman Gloves",
    subtitle: "Padded protection for the trenches",
    category: "gloves",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 2900 },
      { minQty: 50, unitCents: 1150 },
      { minQty: 200, unitCents: 960 },
    ],
    samplePriceCents: 2900,
    moq: 50,
    leadTimeMinDays: 20,
    leadTimeMaxDays: 30,
    summary: "Padded lineman gloves with reinforced palms and knuckle protection, in your team colours.",
    description: "Lineman gloves trade some feel for protection: padded backs, reinforced palms and a secure wrist strap.",
    specs: [
      { label: "Back", value: "Padded knuckle and finger protection" },
      { label: "Palm", value: "Reinforced synthetic leather" },
      { label: "Closure", value: "Hook-and-loop wrist strap" },
    ],
    materials: ["Synthetic leather palm", "Padded back"],
    customizations: ["Team colours", "Logo placement", "Private label"],
    features: ["Padded protection", "Reinforced palm"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    colors: [{ name: "Black / white", hex: "#111111" }],
    tags: ["american football", "lineman", "gloves"],
    useCases: ["clubs", "schools", "brands"],
    images: [P("/media/products/af-lineman-gloves.webp", "Black and white padded American football lineman gloves, back and palm")],
  },
  {
    slug: "performance-tracksuit",
    sku: "GL-SW-601",
    name: "Performance Tracksuit",
    subtitle: "Full-zip jacket and tapered pants",
    category: "sportswear",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 5500 },
      { minQty: 20, unitCents: 2600 },
      { minQty: 50, unitCents: 2200 },
    ],
    samplePriceCents: 5500,
    moq: 20,
    leadTimeMinDays: 18,
    leadTimeMaxDays: 25,
    summary: "A team tracksuit with stand-collar jacket and tapered pants, embroidered or printed with your crest.",
    description: "For travel, warm-ups and the bench. Colour-blocked to match your kit, with embroidered crests and initials.",
    specs: [
      { label: "Fabric", value: "Technical knit — confirmed with quote" },
      { label: "Branding", value: "Embroidered or printed" },
    ],
    materials: ["Technical knit"],
    customizations: ["Team colours", "Embroidered crest", "Player initials", "Private label"],
    features: ["Full-zip jacket", "Zip pockets", "Tapered pants"],
    sizes: TEAM_SIZES,
    colors: [{ name: "Navy / cobalt", hex: "#1e3a8a" }],
    tags: ["tracksuit", "training", "teamwear"],
    useCases: ["clubs", "schools", "academies", "brands"],
    images: [P("/media/products/tracksuit.webp", "Navy tracksuit with cobalt side panels and white piping")],
  },
  {
    slug: "heavyweight-training-hoodie",
    sku: "GL-SW-602",
    name: "Heavyweight Training Hoodie",
    subtitle: "Brushed fleece, embroidered or printed",
    category: "sportswear",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 3900 },
      { minQty: 25, unitCents: 1900 },
      { minQty: 100, unitCents: 1550 },
    ],
    samplePriceCents: 3900,
    moq: 25,
    leadTimeMinDays: 15,
    leadTimeMaxDays: 22,
    summary: "A heavyweight brushed-fleece hoodie for teams, gyms and private-label brands.",
    description: "A warm, durable hoodie that takes embroidery beautifully. Available blank for private-label brands.",
    specs: [
      { label: "Fabric", value: "Brushed fleece — weight confirmed with quote" },
      { label: "Branding", value: "Embroidery, print or woven label" },
    ],
    materials: ["Brushed fleece"],
    customizations: ["Colours", "Embroidery", "Print", "Private label"],
    features: ["Kangaroo pocket", "Ribbed cuffs and hem"],
    sizes: ADULT_SIZES,
    colors: [{ name: "Charcoal", hex: "#374151" }],
    tags: ["hoodie", "fleece", "training"],
    useCases: ["clubs", "gyms", "brands", "corporate"],
    images: [P("/media/products/training-hoodie.webp", "Plain charcoal heavyweight training hoodie")],
  },
  {
    slug: "varsity-jacket-leather-sleeves",
    sku: "GL-LJ-403",
    name: "Varsity Jacket with Leather Sleeves",
    subtitle: "Melton wool body, genuine leather sleeves",
    category: "leather-jackets",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 12500 },
      { minQty: 12, unitCents: 6900 },
      { minQty: 50, unitCents: 5900 },
    ],
    samplePriceCents: 12500,
    moq: 12,
    leadTimeMinDays: 20,
    leadTimeMaxDays: 30,
    summary:
      "The classic letterman jacket: wool body, leather sleeves and striped rib trims, ready for chenille or embroidered lettering.",
    description:
      "Varsity jackets are made for teams, schools and streetwear labels. Choose body and sleeve colours, rib stripe colours and lining, then add chenille patches, embroidery or your woven label.\n\nEvery jacket in a team order can carry its own name and number.",
    specs: [
      { label: "Body", value: "Melton wool blend — weight confirmed with quote" },
      { label: "Sleeves", value: "Genuine leather (cowhide) or PU option" },
      { label: "Trims", value: "Striped rib collar, cuffs and hem in your colours" },
      { label: "Decoration", value: "Chenille patches, embroidery, woven labels" },
    ],
    materials: ["Melton wool blend", "Cowhide leather sleeves"],
    customizations: ["Body & sleeve colours", "Rib stripe colours", "Chenille patches", "Names & numbers", "Private label"],
    features: ["Leather sleeves", "Striped rib trims", "Snap front"],
    sizes: ADULT_SIZES,
    colors: [
      { name: "Navy / cream", hex: "#1e2a4a" },
      { name: "Custom", hex: "#2f54ff" },
    ],
    tags: ["varsity", "letterman", "jacket", "leather sleeves", "school", "team"],
    useCases: ["schools", "clubs", "brands", "retailers"],
    images: [P("/media/products/varsity-jacket.webp", "Navy wool varsity jacket with cream leather sleeves and striped trims")],
  },
  {
    slug: "kart-racing-gloves",
    sku: "GL-GV-504",
    name: "Kart Racing Gloves",
    subtitle: "Pre-curved fingers, grip-printed palm",
    category: "gloves",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 3200 },
      { minQty: 20, unitCents: 1450 },
      { minQty: 100, unitCents: 1180 },
    ],
    samplePriceCents: 3200,
    moq: 20,
    leadTimeMinDays: 18,
    leadTimeMaxDays: 25,
    summary:
      "Lightweight karting gloves with pre-curved fingers, a grip-printed palm and a hook-and-loop cuff — made to match your suits.",
    description:
      "Kart gloves need feel more than bulk. Pre-curved fingers reduce fatigue on the wheel, and a silicone grip print on the palm keeps your hold in the wet. Colours and logos match your team suits.",
    specs: [
      { label: "Palm", value: "Suede-style palm with silicone grip print" },
      { label: "Back", value: "Breathable mesh" },
      { label: "Fingers", value: "Pre-curved" },
      { label: "Cuff", value: "Short elasticated cuff, hook-and-loop strap" },
    ],
    materials: ["Suede-style palm", "Mesh back"],
    customizations: ["Team colours", "Logo placement", "Private label"],
    features: ["Pre-curved fingers", "Grip-printed palm", "Breathable back"],
    sizes: ["Kids S", "Kids M", "Kids L", "S", "M", "L", "XL", "2XL"],
    colors: [
      { name: "Black / fluo yellow", hex: "#d9f99d" },
      { name: "Custom", hex: "#2f54ff" },
    ],
    tags: ["kart", "karting", "gloves", "racing", "motorsport"],
    useCases: ["racing-teams", "riders", "clubs", "brands"],
    images: [P("/media/products/kart-gloves.webp", "Black and fluorescent yellow karting gloves, palm and back")],
  },
  {
    slug: "sublimated-american-football-jersey",
    sku: "GL-TW-106",
    name: "Sublimated American Football Jersey",
    subtitle: "Cut for shoulder pads, numbers printed in",
    category: "sublimation-teamwear",
    status: "ACTIVE",
    featured: true,
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 3400 },
      { minQty: 15, unitCents: 1750 },
      { minQty: 50, unitCents: 1450 },
      { minQty: 100, unitCents: 1290 },
    ],
    samplePriceCents: 3400,
    moq: 15,
    leadTimeMinDays: 15,
    leadTimeMaxDays: 22,
    summary:
      "A game jersey cut to fit over shoulder pads, with numbers, stripes and names sublimated into the mesh — nothing to peel.",
    description:
      "American football jerseys take a beating. Sublimating the numbers, shoulder stripes and names into the fabric means nothing peels or cracks, and the mesh stays light and breathable.\n\nPair with our receiver or lineman gloves in matching colours for a complete team order.",
    specs: [
      { label: "Print method", value: "Full-colour dye sublimation" },
      { label: "Fabric", value: "Breathable mesh — weight confirmed with quote" },
      { label: "Cut", value: "Over-the-pads fit, short sleeve" },
      { label: "Decoration", value: "Numbers, names, stripes and logos printed in" },
    ],
    materials: ["Polyester mesh"],
    customizations: ["Fully custom design", "Player names & numbers", "Team logos", "Custom neck tape & labels"],
    features: ["Fits over shoulder pads", "Numbers can't peel", "Breathable mesh"],
    sizes: TEAM_SIZES,
    colors: [
      { name: "Red / white / black", hex: "#991b1b" },
      { name: "Any colour", hex: "#2f54ff" },
    ],
    tags: ["american football", "nfl", "gridiron", "jersey", "sublimation"],
    useCases: ["clubs", "schools", "leagues", "brands"],
    images: [P("/media/products/af-jersey.webp", "Red sublimated American football jersey with white number 24 and shoulder stripes")],
  },
  {
    slug: "sublimated-basketball-uniform",
    sku: "GL-TW-107",
    name: "Sublimated Basketball Uniform",
    subtitle: "Jersey and shorts designed as one set",
    category: "sublimation-teamwear",
    status: "ACTIVE",
    purchaseMode: "BOTH",
    priceTiers: [
      { minQty: 1, unitCents: 3200 },
      { minQty: 10, unitCents: 1650 },
      { minQty: 50, unitCents: 1350 },
    ],
    samplePriceCents: 3200,
    moq: 10,
    leadTimeMinDays: 14,
    leadTimeMaxDays: 21,
    summary: "A sleeveless jersey and matching shorts, sublimated edge to edge with your pattern, numbers and names.",
    description:
      "Gradients, geometric patterns and side panels cost no more than a plain colour when they're sublimated. Jersey and shorts are designed together so the pattern flows across the set.",
    specs: [
      { label: "Print method", value: "Full-colour dye sublimation" },
      { label: "Set", value: "Sleeveless jersey + shorts" },
      { label: "Fabric", value: "Breathable mesh — weight confirmed with quote" },
      { label: "Options", value: "Reversible construction on request" },
    ],
    materials: ["Polyester mesh"],
    customizations: ["Fully custom design", "Player names & numbers", "Team logos", "Reversible option"],
    features: ["Pattern flows across the set", "Breathable mesh", "Any design at no extra cost"],
    sizes: TEAM_SIZES,
    colors: [
      { name: "Teal / white", hex: "#0f9e9e" },
      { name: "Any colour", hex: "#2f54ff" },
    ],
    tags: ["basketball", "uniform", "jersey", "shorts", "sublimation"],
    useCases: ["clubs", "schools", "leagues", "academies"],
    images: [P("/media/products/basketball-uniform.webp", "Teal sublimated basketball jersey and shorts with geometric pattern and number 7")],
  },
];

export const faqs: { question: string; answer: string; topic: string }[] = [
  {
    topic: "ordering",
    question: "What is your minimum order quantity?",
    answer:
      "It depends on the product and how much customisation it needs — each product page shows its starting quantity. Samples can be ordered on most products, and if your run is smaller than the listed minimum, send a quote request and we'll tell you what's possible.",
  },
  {
    topic: "oem",
    question: "Can you make products under my own brand?",
    answer:
      "Yes. We manufacture under your label: your woven or printed labels, neck tape, hang tags and packaging. Share your brand files with your quote request and we'll include them in the sample.",
  },
  {
    topic: "ordering",
    question: "Can I get a sample before a bulk order?",
    answer:
      "Yes, and we recommend it. Most products can be bought as a sample directly from the product page, or we can make a custom approval sample of your design. Sample cost and timing are confirmed with your quote.",
  },
  {
    topic: "production",
    question: "How long does production take?",
    answer:
      "It depends on the product, the quantity and the season. Each product page shows a typical range; your quote confirms an exact production date once the design is approved.",
  },
  {
    topic: "design",
    question: "What artwork files do you need?",
    answer:
      "Vector files (AI, EPS, PDF or SVG) are best; high-resolution PNG works too. If you only have a sketch, a photo or a reference kit, send that — we can help prepare the artwork before you approve it.",
  },
  {
    topic: "production",
    question: "What is sublimation, and why does it matter for team kits?",
    answer:
      "Sublimation prints your design onto transfer paper and then uses heat and pressure to turn the ink into a gas that bonds with polyester fibres. The design becomes part of the fabric, so it can't crack or peel, and complex designs cost no more than plain ones. We print and press in our own factory.",
  },
  {
    topic: "quality",
    question: "Are your racing suits and gloves certified?",
    answer:
      "Protective ratings (such as CE ratings for motorcycle garments and armour) depend on the exact garment, the armour fitted and testing by an approved lab. We confirm what is available for your specific order and share the documents — we never label a product as certified without them.",
  },
  {
    topic: "shipping",
    question: "How is my order shipped?",
    answer:
      "By air freight, sea freight or express courier, depending on size, budget and deadline. Freight is quoted after your order is confirmed, so you only pay for the service you choose.",
  },
  {
    topic: "payment",
    question: "How do I pay?",
    answer:
      "Once we confirm your order, we email a proforma invoice for bank transfer, or a secure payment link if you'd rather pay by card or PayPal.",
  },
];
