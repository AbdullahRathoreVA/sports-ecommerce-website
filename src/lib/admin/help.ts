/**
 * The admin guide, as data (pattern from the Tiny Stars / Al-Amin CRM `core/help.ts`).
 *
 * The Help page shows these topics and the Help AI answers ONLY from them, so the words on
 * screen and the words the AI quotes are the same words. RULE: any change to an admin screen,
 * button, permission or limit updates the matching topic in the same commit — a stale topic
 * teaches the owner a website that no longer exists.
 *
 * Written for someone who has never used an admin panel: plain words, real button names,
 * and what does NOT work said as plainly as what does.
 */

export type HelpTopic = {
  id: string;
  section: (typeof HELP_SECTIONS)[number];
  title: string;
  summary: string;
  body: string[];
  steps?: string[];
  notes?: string[];
  /** Extra words people might search for. */
  keywords?: string[];
};

export const HELP_SECTIONS = ["Start here", "Leads & customers", "Orders", "Products & photos", "Website content", "Visitors & numbers", "Team & security", "What it cannot do"] as const;

export const HELP: HelpTopic[] = [
  // ── Start here ──
  {
    id: "what-is-admin",
    section: "Start here",
    title: "What the admin is, in one minute",
    summary: "The private back office of the website: enquiries, chats, orders, products, photos, reviews and visitor numbers.",
    body: [
      "The public website talks to buyers. The admin is where your team works: every enquiry (lead) lands here, every AI chat is saved here, orders are tracked here, and products, photos, categories and reviews are edited here.",
      "The menu on the left (on a phone: the ☰ button) has: Overview, Live, Analytics, Orders, Leads & quotes, Chats, Customers, Products, Photos, Reviews, Content & settings, AI analyst, Help, Audit log and Admin users. You only see the parts your role allows.",
    ],
    keywords: ["menu", "dashboard", "start", "overview", "kya hai", "admin panel"],
  },
  {
    id: "signing-in",
    section: "Start here",
    title: "Signing in, password and signing out",
    summary: "Go to /admin, sign in with your email and password. Change your password under your name → Account.",
    body: [
      "Open the website address followed by /admin and sign in. If you type the wrong password several times, sign-in pauses for a short while on purpose — wait and try again.",
      "To change your password: click your name at the bottom of the menu → Account. Nobody (not even the developer) can read your password; it is stored scrambled.",
      "Sign out from the bottom of the menu. On a shared computer always sign out.",
    ],
    keywords: ["login", "log in", "password", "change password", "forgot", "logout"],
  },
  {
    id: "daily-routine",
    section: "Start here",
    title: "A good daily routine (10 minutes)",
    summary: "Check new leads, read new chats, approve reviews, update orders.",
    body: ["Red numbers next to menu items show what needs you: new leads, pending orders and reviews waiting for approval."],
    steps: [
      "Leads & quotes: open every New lead and reply the same day (the first supplier to answer usually wins). Move it to Contacted.",
      "Chats: read what visitors asked the AI. If someone left a number or email, press “Save as a lead”.",
      "Leads → Interested visitors: see who looked at many products today.",
      "Reviews: publish genuine new reviews.",
      "Orders: update the status and add QC / packing photos so customers see progress.",
    ],
    keywords: ["routine", "every day", "what to do", "kaam"],
  },
  {
    id: "overview-page",
    section: "Start here",
    title: "The Overview page and the go-live checklist",
    summary: "Key numbers for the chosen period plus a checklist of what the website still needs (phone, WhatsApp, domain…).",
    body: [
      "Overview shows visits, enquiries, orders and the conversion funnel for the period you choose at the top.",
      "The go-live checklist ticks itself off when something is done — for example after you add the WhatsApp number in Content & settings.",
    ],
    keywords: ["overview", "checklist", "go live", "numbers"],
  },

  // ── Leads & customers ──
  {
    id: "where-leads-come-from",
    section: "Leads & customers",
    title: "Where leads come from",
    summary: "Every enquiry becomes a lead automatically — from the website or added by your team.",
    body: [
      "From the website: the quote form, product pages, the contact form, the AI chat (when the visitor leaves an email), the Design Studio, the “Send me prices” offer and the product finder.",
      "Added by you: “Add a lead” for WhatsApp messages, calls, trade-show cards and referrals.",
      "From the Lead finder: businesses you found and saved yourself.",
      "The Source column and the filter on the Leads page show where each one came from.",
    ],
    keywords: ["leads", "quotes", "enquiries", "rfq", "source", "kahan se"],
  },
  {
    id: "add-lead",
    section: "Leads & customers",
    title: "Adding a lead by hand (WhatsApp, call, exhibition)",
    summary: "Leads & quotes → Add a lead. Name plus at least a phone, email or website.",
    body: ["Use this for every enquiry that did not come through the website, so the whole sales pipeline is in one place."],
    steps: [
      "Open Leads & quotes and press “Add a lead”.",
      "Fill in the name (person or business) and at least one of: phone/WhatsApp, email, website.",
      "Choose how they reached you (WhatsApp, Phone call, Exhibition …) and the best way to reply.",
      "Add what they want, the quantity and your notes, then “Save lead”. The lead opens and is assigned to you.",
    ],
    keywords: ["manual", "add lead", "new lead", "whatsapp lead", "khud add"],
  },
  {
    id: "lead-page",
    section: "Leads & customers",
    title: "Working a lead",
    summary: "Read the AI brief and the request, see their website visit, reply, add notes, move the stage, turn it into an order.",
    body: [
      "AI brief: a short summary of what they want. Always check it against their own words below it.",
      "Their visit to the website: where they came from (Google, Instagram…), their city, device, which products they looked at and every step in order.",
      "Activity: add a note after every call or WhatsApp chat so the whole team knows what was agreed.",
      "Pipeline (right side): choose the stage and the owner, then Save.",
      "Reply by email: ready templates for a quote, asking for details and a follow-up. Contact: tap the email, phone or WhatsApp link.",
      "Edit contact details: fix or add a phone, email, city or website. Delete lead: for spam or duplicates (asks twice).",
    ],
    keywords: ["lead page", "reply", "notes", "owner", "assign", "edit contact", "delete lead", "whatsapp"],
  },
  {
    id: "pipeline-stages",
    section: "Leads & customers",
    title: "What the stages mean",
    summary: "New → Contacted → Qualified → Quoted → Negotiating → Won / Lost.",
    body: [
      "New: nobody has replied yet. Contacted: you replied (sending an email from the lead does this automatically). Qualified: a real buyer with a real need. Quoted: you sent a price. Negotiating: discussing price, sample or dates. Won: they ordered. Lost: they chose someone else or went silent.",
    ],
    keywords: ["stage", "status", "pipeline", "won", "lost", "quoted"],
  },
  {
    id: "lead-finder",
    section: "Leads & customers",
    title: "Lead finder — find new buyers yourself",
    summary: "Leads & quotes → Lead finder. Pick a type (clubs, schools, sports shops, motorbike shops, karting, gyms, boutiques), type a city, press Find.",
    body: [
      "Results are real places from OpenStreetMap with the phone, email, website or Instagram the map has for them. Ones with contact details come first.",
      "Each result has ready buttons: email (opens your mail with a first message written), call, WhatsApp (with the message) and the website. “First message to send” shows the message to copy.",
      "Press “Save as lead” on the good ones: they go to Leads with the source “Lead finder” and stage New, so you can follow up.",
    ],
    steps: ["Choose who you are looking for.", "Type the city as “City, Country” (e.g. Manchester, UK).", "Choose the distance and press Find.", "Save the good ones and send the first message."],
    notes: ["A search takes 5–20 seconds. If the map service is busy, try again in a minute.", "Not every business has added a phone or email to the map — untick “Only ones with contact details” to see all."],
    keywords: ["find leads", "prospects", "new customers", "clubs", "schools", "shops", "search", "naye customer"],
  },
  {
    id: "interested-visitors",
    section: "Leads & customers",
    title: "Interested visitors",
    summary: "People who looked seriously in the last 14 days but haven't shared contact details yet.",
    body: [
      "Leads & quotes → Interested visitors lists anonymous visitors by interest: product views, a started quote, a WhatsApp tap, Design Studio use or a chat. Click one to see everything they did.",
      "You can't contact them until they share a detail — the moment they use the chat, a form or the price offer, they move to Leads with their whole visit attached.",
    ],
    keywords: ["visitors", "who visited", "anonymous", "hot visitors", "kis ne dekha"],
  },
  {
    id: "price-offer",
    section: "Leads & customers",
    title: "The “Send me prices” offer on the website",
    summary: "A small box offering prices, shown only to clearly interested visitors. Name + email or WhatsApp creates a lead.",
    body: [
      "It appears after a visitor opens two product pages, or spends 40 seconds on one. Never on the quote, contact or checkout pages, never on top of the chat, at most once a week, and never again after they send it.",
      "Leads from it have the source “Website price offer” and include the product and quantity they asked about.",
    ],
    keywords: ["popup", "price offer", "capture", "send me prices"],
  },
  {
    id: "chats",
    section: "Leads & customers",
    title: "Chats — read every AI conversation",
    summary: "Chats shows every conversation visitors had with the website's AI assistant, in full.",
    body: [
      "Search by what people asked. Open a chat to read it all, with the visitor's city, device and what they did on the website.",
      "If they typed an email or phone number in the chat, “Save as a lead” turns it into a lead in one tap. Chats that already became a lead show the lead number.",
      "Delete chat removes it (asks twice).",
    ],
    keywords: ["chat", "conversation", "ai chat", "transcript", "baat cheet"],
  },
  {
    id: "customers",
    section: "Leads & customers",
    title: "Customers and portal sign-ups",
    summary: "Everyone who ordered, asked for a quote or created an account, with their full history.",
    body: [
      "Customers lists people with an email on file. Open one to see their orders, enquiries and whether they signed up to the client portal (where they track orders and re-order).",
      "You can verify a portal account or sign a customer out of all devices from their page.",
    ],
    keywords: ["customers", "sign ups", "accounts", "portal", "client"],
  },
  {
    id: "quote-to-order",
    section: "Leads & customers",
    title: "Turning an agreed quote into an order",
    summary: "On the lead page, “Turn into an order”: enter the agreed price, quantity and delivery address.",
    body: [
      "The order gets an order number and a tracking page, exactly like an online order. The lead moves to Won.",
      "The customer's email is needed (the tracking link is sent there) — add it under Contact first if the lead came from WhatsApp.",
    ],
    keywords: ["create order", "order from quote", "won", "confirm order"],
  },

  // ── Orders ──
  {
    id: "orders",
    section: "Orders",
    title: "Updating an order",
    summary: "Orders → open an order → change status, add the tracking number, upload QC and packing photos, email the customer.",
    body: [
      "Status: Pending → Confirmed → Processing → Manufacturing → Shipped → Delivered. The customer sees each step on their tracking page and in the client portal.",
      "Add quality-check and packing photos so the buyer sees their goods before they ship — it builds trust.",
    ],
    keywords: ["order", "status", "tracking", "shipped", "qc photos", "packing"],
  },
  {
    id: "samples",
    section: "Orders",
    title: "Sample orders ($100)",
    summary: "Buyers can order one sample online before a bulk order (minimum 50 pieces per design).",
    body: ["Sample orders appear under Orders like any other order. Bulk pricing is always custom — there is no price list on the website."],
    keywords: ["sample", "100", "moq", "minimum"],
  },

  // ── Products & photos ──
  {
    id: "add-product",
    section: "Products & photos",
    title: "Adding or editing a product",
    summary: "Products → New product (or open one). Name, category, description, options, photos, then status Active.",
    body: [
      "Status: Active shows it on the website, Draft hides it while you work on it, Archived hides it but keeps its history.",
      "Choose the category it belongs to. From a category you can also press “+ Add a product to this category”.",
      "Some starter products were archived on 12 Oct 2026 because they had no photo yet — add a photo and set them back to Active.",
    ],
    keywords: ["product", "new product", "add product", "edit product", "archive", "draft"],
  },
  {
    id: "categories",
    section: "Products & photos",
    title: "Adding, hiding or deleting a category",
    summary: "Content & settings → Categories → “Add a category”. New categories start hidden until they have a photo and products.",
    body: ["Categories are the product lines on the home page and in the Products menu (e.g. Footballs, Goalkeeper gloves)."],
    steps: [
      "Content & settings → Categories → Add a category. Type the name, a one-line tagline and a description → Create.",
      "Open it, upload a card photo, set its order on the site.",
      "Press “+ Add a product to this category” and add its products.",
      "Tick “Show this category on the site” and Save.",
    ],
    notes: ["Only an empty category can be deleted. Move or delete its products first — or simply untick “Show this category on the site” to hide it."],
    keywords: ["category", "categories", "product line", "new category", "delete category", "hide"],
  },
  {
    id: "photos",
    section: "Products & photos",
    title: "Uploading and placing photos",
    summary: "Photos → upload → choose where each photo goes (product, category or guide) → make main, move or delete.",
    body: [
      "Phone photos are shrunk automatically before upload. A clear photo on a plain background looks best.",
      "Never upload photos with another company's logo or certification marks (copyright).",
    ],
    keywords: ["photo", "image", "upload", "picture", "tasveer", "main photo", "delete photo"],
  },

  // ── Website content ──
  {
    id: "reviews",
    section: "Website content",
    title: "Client reviews",
    summary: "Reviews: publish, reply to or reject reviews from customers; ask real customers for honest feedback with a one-time link.",
    body: [
      "Customers send reviews at /reviews/new. They wait under “Waiting for you” until you press Publish. Publish critical reviews too — buyers trust a mix, and hiding honest criticism is against the law in the US (FTC).",
      "Edit / reply: add a public reply (shown under the review) or a private note (team only). Don't change the customer's words.",
      "Reject: only for spam, abuse, duplicates or people who were never customers — write the reason. Rejected reviews are kept under “Rejected / spam” and never shown.",
      "Verified buyer is set in two ways only: the review came through a one-time review link for a real order, or you press Verify and type the order or invoice number you checked. An email address alone is not proof.",
      "Review requests: orders you set to Shipped or Delivered appear under “Review requests”. Press “Ask for a review” → “Email the request” (sends from info@) or “Create link for WhatsApp”. Each link works once and expires after 60 days. Ask 7–14 days after delivery, send at most one reminder, and don't ask while a complaint is open.",
      "Past customers from before the website: use “Ask a past customer…”, or add their review yourself with Add a review — only their own words, with their permission.",
      "Templates: copy ready email/WhatsApp messages (after delivery, after sample, bulk order, repeat customer, one reminder, permission to publish, thanks for criticism).",
      "The numbers at the top count only published, genuine reviews: average, % verified, waiting/rejected, time to publish, and how many review requests were opened and answered.",
    ],
    notes: [
      "Only ever publish genuine reviews from real customers, in their own words, with permission. Fake or invented reviews are illegal (US FTC fines are over $50,000 per review) and Google removes them.",
      "Never offer a discount or gift for a review, and never ask only the customers you think are happy.",
      "Demo reviews (“Demo Buyer 01” …) exist only for testing on a developer's computer and can never appear on the live website.",
    ],
    keywords: ["review", "reviews", "testimonial", "rating", "stars", "feedback", "verified", "invite", "request", "reject", "reply"],
  },
  {
    id: "contact-settings",
    section: "Website content",
    title: "Phone, WhatsApp, email and company details",
    summary: "Content & settings → Settings. What you enter here appears across the website, the AI chat and Google.",
    body: [
      "Add the factory phone, WhatsApp number (digits with country code) and sales email here. Until a factory phone is set, the website shows the Italy office number (+39 344 408 0435); the contact person's name is never shown.",
      "Company facts (founded, export markets, capacity) only appear when filled in — only enter true facts.",
    ],
    keywords: ["phone", "whatsapp", "email", "address", "settings", "contact", "number"],
  },
  {
    id: "faqs-guides-certs",
    section: "Website content",
    title: "FAQs, buyer guides and certificates",
    summary: "Content & settings → FAQs / Guides / Certifications.",
    body: [
      "FAQs answer common buyer questions (the AI chat uses them too). Guides are articles under Buyer guides.",
      "Certifications: add only certificates you can show, with the issuer and certificate number.",
    ],
    keywords: ["faq", "guide", "blog", "certificate", "iso"],
  },
  {
    id: "website-features",
    section: "Website content",
    title: "What customers can do on the website",
    summary: "3D showroom, Design Studio (kits, gloves, footballs), AI chat, quote form with squad list, sample orders, client portal, order tracking.",
    body: [
      "Design Studio: buyers design a kit, goalkeeper gloves or a football in 3D and send it with a quote request — the design appears on the lead.",
      "AI chat: answers questions any time in any language and passes enquiries to you. Squad list: names, numbers and sizes for kit orders, with numbered kit bags.",
    ],
    keywords: ["design studio", "3d", "chat", "squad list", "portal", "tracking"],
  },

  // ── Visitors & numbers ──
  {
    id: "analytics",
    section: "Visitors & numbers",
    title: "Analytics and Live",
    summary: "Analytics: visits, countries, cities, sources, top pages and products, clicks. Live: who is on the website right now.",
    body: [
      "Choose a period at the top. Sources show where visitors came from (Google, Instagram, direct…). Robots are not counted.",
      "Analytics is cookie-free and stores no names — individual visitors are anonymous until they contact you.",
    ],
    keywords: ["analytics", "visits", "traffic", "countries", "cities", "live", "kitne log"],
  },
  {
    id: "ai-analyst",
    section: "Visitors & numbers",
    title: "AI analyst",
    summary: "Ask questions about your numbers in plain words, e.g. “Which product got the most enquiries this month?”",
    body: ["It answers only from the website's numbers for the chosen period and never sees customers' names or emails. Double-check important numbers on the Analytics page."],
    keywords: ["ai analyst", "ask ai", "report"],
  },

  // ── Team & security ──
  {
    id: "team",
    section: "Team & security",
    title: "Adding team members and roles",
    summary: "Admin users (owner only): add a person, choose a role, deactivate when they leave.",
    body: [
      "Owner: everything. Admin: everything except managing admin users. Sales: leads, chats, orders, customers, analytics and the AI analyst. Editor: products, photos, categories, reviews and content.",
      "Deactivating someone signs them out everywhere immediately.",
    ],
    keywords: ["user", "team", "role", "staff", "permission", "add user"],
  },
  {
    id: "audit",
    section: "Team & security",
    title: "Audit log",
    summary: "Who changed what and when — every save, delete and email.",
    body: ["Use it to check what happened to an order, a product or a lead."],
    keywords: ["audit", "history", "who changed"],
  },

  // ── What it cannot do ──
  {
    id: "no-visitor-contacts",
    section: "What it cannot do",
    title: "It cannot show a visitor's phone or email unless they share it",
    summary: "Browsers never reveal who a visitor is; collecting it secretly is illegal in Europe and the US.",
    body: [
      "You see anonymous visits (city, device, pages, source) and, the moment someone uses the chat, a form, the price offer or signs up, their details with their whole visit attached.",
      "To get more contacts: reply fast, use the Lead finder, and send people to the website from Instagram/WhatsApp.",
    ],
    keywords: ["visitor email", "visitor phone", "who visited", "identify visitors", "number kaise"],
  },
  {
    id: "emails-not-sent",
    section: "What it cannot do",
    title: "Emails are saved, but only sent once the company email is connected",
    summary: "Until the domain and email (e.g. sales@alrobelsportswear.com) are connected, emails from the admin are logged, not delivered.",
    body: ["Reply on WhatsApp or from your own email in the meantime. After the domain is connected, emails from leads and orders are delivered automatically."],
    keywords: ["email not sent", "email", "domain", "zoho", "resend"],
  },
  {
    id: "ai-limits",
    section: "What it cannot do",
    title: "AI can be wrong",
    summary: "AI summaries, chat answers and help answers are helpful but not always right — check before quoting a price or a date.",
    body: ["The website AI never invents prices: pricing is custom and confirmed by your team in writing."],
    keywords: ["ai wrong", "mistake", "price"],
  },
];

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿऀ-ॿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
const STOP = new Set(["the", "and", "how", "what", "can", "you", "for", "with", "this", "that", "are", "does", "kya", "kaise", "kese", "hai", "mein", "main", "karna", "karo", "hain", "nahi", "aur", "where", "who"]);

/** Keyword search over the guide (also the fallback when no AI provider answers). */
export function searchHelp(question: string, limit = 4): HelpTopic[] {
  const q = words(question);
  if (q.length === 0) return [];
  const scored = HELP.map((t) => {
    const hay = `${t.title} ${t.summary} ${t.keywords?.join(" ") ?? ""}`.toLowerCase();
    const body = `${t.body.join(" ")} ${(t.steps ?? []).join(" ")} ${(t.notes ?? []).join(" ")}`.toLowerCase();
    const score = q.reduce((n, w) => n + (hay.includes(w) ? 3 : 0) + (body.includes(w) ? 1 : 0), 0);
    return { t, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.t);
}

export function topicText(t: HelpTopic) {
  return [`# ${t.title}`, t.summary, ...t.body, ...(t.steps?.map((s, i) => `${i + 1}. ${s}`) ?? []), ...(t.notes?.map((n) => `Note: ${n}`) ?? [])].join("\n");
}
