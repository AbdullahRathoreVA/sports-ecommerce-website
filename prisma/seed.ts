/**
 * Seed: catalogue, content, admin users and (optionally) demo records.
 *
 *   npm run db:seed            catalogue + content + admins (idempotent)
 *   npm run db:seed -- --demo  …plus regenerate simulated demo data
 *
 * Idempotent: re-running never overwrites a product an admin has taken
 * ownership of (isDemo = false) or a site setting an admin has saved.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { categories, products, faqs } from "./data/catalog";
import { posts } from "./data/posts";
import {
  prng,
  pick,
  weighted,
  DEMO_COUNTRIES,
  DEMO_CHANNELS,
  DEMO_REFERRERS,
  DEMO_DEVICES,
  DEMO_BROWSERS,
  DEMO_OS,
  DEMO_COMPANIES,
  type Rand,
} from "./data/demo";
import { defaultSettings } from "../src/config/site";

function client() {
  const url = new URL(process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "");
  const schema = url.searchParams.get("schema") ?? "public";
  url.search = "";
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url.toString(), ssl: { rejectUnauthorized: false } }, { schema }),
  });
}

const db = client();
const WITH_DEMO = process.argv.includes("--demo");

async function seedSettings() {
  const existing = await db.setting.findUnique({ where: { key: "site" } });
  if (!existing) {
    await db.setting.create({ data: { key: "site", value: defaultSettings as unknown as Prisma.InputJsonValue } });
    console.log("settings: created defaults");
  }
}

async function seedCatalogue() {
  const catIds = new Map<string, string>();
  for (const c of categories) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, published: true },
    });
    catIds.set(c.slug, row.id);
  }

  let created = 0;
  for (const p of products) {
    const existing = await db.product.findUnique({ where: { slug: p.slug } });
    if (existing && !existing.isDemo) continue; // an admin owns this record now

    const data = {
      sku: p.sku,
      name: p.name,
      subtitle: p.subtitle,
      summary: p.summary,
      description: p.description,
      status: p.status,
      featured: p.featured ?? false,
      categoryId: catIds.get(p.category)!,
      purchaseMode: p.purchaseMode,
      priceCents: p.priceTiers[0]?.unitCents ?? null,
      samplePriceCents: p.samplePriceCents ?? null,
      priceTiers: p.priceTiers,
      moq: p.moq,
      leadTimeMinDays: p.leadTimeMinDays ?? null,
      leadTimeMaxDays: p.leadTimeMaxDays ?? null,
      specs: p.specs,
      materials: p.materials,
      customizations: p.customizations,
      features: p.features,
      sizes: p.sizes,
      colors: p.colors,
      tags: p.tags,
      useCases: p.useCases,
      seoTitle: p.seoTitle ?? null,
      seoDesc: p.seoDesc ?? null,
      position: products.indexOf(p),
      isDemo: true,
    };

    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });

    await db.productImage.deleteMany({ where: { productId: product.id } });
    if (p.images.length) {
      await db.productImage.createMany({
        data: p.images.map((img, i) => ({ productId: product.id, position: i, ...img })),
      });
    }

    // One variant per size (custom colours are specified per order).
    await db.productVariant.deleteMany({ where: { productId: product.id } });
    if (p.purchaseMode !== "QUOTE") {
      await db.productVariant.createMany({
        data: p.sizes.map((size) => ({
          productId: product.id,
          sku: `${p.sku}-${size.replace(/\s+/g, "").toUpperCase()}`,
          size,
          color: "",
          stock: null,
        })),
      });
    }
    created++;
  }
  console.log(`catalogue: ${categories.length} categories, ${created} products seeded/refreshed`);
}

async function seedContent() {
  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({ data: faqs.map((f, i) => ({ ...f, position: i })) });
  }
  for (const post of posts) {
    await db.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        topic: post.topic,
        coverImage: post.coverImage,
        coverAlt: post.coverAlt,
        seoDesc: post.seoDesc,
        published: true,
        publishedAt: new Date(Date.now() - (posts.indexOf(post) + 1) * 6 * 86_400_000),
      },
    });
  }
  console.log(`content: ${faqs.length} FAQs, ${posts.length} guides`);
}

async function seedAdmins() {
  const accounts = [
    { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, name: "Demo Owner", role: "OWNER" as const },
    { email: process.env.SALES_EMAIL, password: process.env.SALES_PASSWORD, name: "Demo Sales", role: "SALES" as const },
  ];
  for (const a of accounts) {
    if (!a.email || !a.password) continue;
    const email = a.email.toLowerCase();
    const exists = await db.adminUser.findUnique({ where: { email } });
    if (exists) continue; // never rotate a password silently
    await db.adminUser.create({
      data: { email, name: a.name, role: a.role, passwordHash: await bcrypt.hash(a.password, 12) },
    });
    console.log(`admin: created ${a.role} ${email}`);
  }
}

// ─── Demo data ──────────────────────────────────────────────────────────────

async function purgeDemo() {
  await db.event.deleteMany({ where: { isDemo: true } });
  await db.session.deleteMany({ where: { isDemo: true } });
  await db.visitor.deleteMany({ where: { isDemo: true } });
  await db.orderItem.deleteMany({ where: { order: { isDemo: true } } });
  await db.orderEvent.deleteMany({ where: { order: { isDemo: true } } });
  await db.order.deleteMany({ where: { isDemo: true } });
  await db.leadNote.deleteMany({ where: { lead: { isDemo: true } } });
  await db.lead.deleteMany({ where: { isDemo: true } });
  await db.customer.deleteMany({ where: { isDemo: true } });
}

type ProductLite = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  purchaseMode: string;
  priceTiers: { minQty: number; unitCents: number }[];
  moq: number;
  category: string;
  image: string | null;
  weight: number;
};

const VIEW_WEIGHTS: Record<string, number> = {
  "custom-sublimated-football-kit": 22,
  "one-piece-leather-race-suit": 14,
  "american-football-receiver-gloves": 12,
  "classic-biker-leather-jacket": 11,
  "long-sleeve-goalkeeper-kit": 8,
  "striped-match-kit": 8,
  "kart-racing-suit": 7,
  "two-piece-leather-suit": 6,
  "car-racing-suit": 5,
  "pro-fit-match-jersey": 4,
  "club-kit-pack": 3,
};

function unitPrice(tiers: { minQty: number; unitCents: number }[], qty: number) {
  let price = tiers[0]?.unitCents ?? 0;
  for (const t of tiers) if (qty >= t.minQty) price = t.unitCents;
  return price;
}

function dateAt(daysAgo: number, r: Rand): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  // Peaks around midday and evening UTC (UK/EU working day, Gulf/Pakistan evening).
  const hour = weighted(r, [
    [3, 2], [6, 3], [8, 6], [9, 8], [10, 10], [11, 11], [12, 11], [13, 10], [14, 9],
    [15, 8], [16, 8], [17, 8], [18, 9], [19, 9], [20, 8], [21, 6], [22, 4], [0, 2],
  ] as const);
  d.setUTCHours(hour, Math.floor(r() * 60), Math.floor(r() * 60), 0);
  if (d > new Date()) d.setTime(Date.now() - Math.floor(r() * 3_600_000));
  return d;
}

const id = (r: Rand, prefix: string) => prefix + Math.floor(r() * 36 ** 10).toString(36).padStart(10, "0") + Math.floor(r() * 36 ** 6).toString(36);

async function seedDemo() {
  await purgeDemo();
  const r = prng(20261005);

  const rows = await db.product.findMany({
    where: { status: "ACTIVE" },
    include: { category: true, images: { orderBy: { position: "asc" }, take: 1 } },
  });
  const catalog: ProductLite[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku,
    purchaseMode: p.purchaseMode,
    priceTiers: (p.priceTiers as ProductLite["priceTiers"]) ?? [],
    moq: p.moq,
    category: p.category.slug,
    image: p.images[0]?.url ?? null,
    weight: VIEW_WEIGHTS[p.slug] ?? 3,
  }));
  const productWeights = catalog.map((p) => [p, p.weight] as const);
  const categorySlugs = [...new Set(catalog.map((p) => p.category))];

  const visitors: { id: string; country: string; firstSeenAt: Date; lastSeenAt: Date; sessions: number; isDemo: boolean }[] = [];
  const sessions: Prisma.SessionCreateManyInput[] = [];
  const events: Prisma.EventCreateManyInput[] = [];
  const purchases: { at: Date; sessionId: string; product: ProductLite; qty: number; country: string }[] = [];
  const quotes: { at: Date; sessionId: string; product: ProductLite | null; source: string; country: string }[] = [];

  const DAYS = 120;
  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo--) {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - daysAgo);
    const dow = day.getUTCDay();
    const weekday = dow === 0 || dow === 6 ? 0.82 : dow === 5 ? 0.92 : 1.06;
    const growth = 0.85 + (0.3 * (DAYS - daysAgo)) / DAYS;
    const count = Math.round(44 * weekday * growth * (0.8 + r() * 0.4));

    for (let s = 0; s < count; s++) {
      const start = dateAt(daysAgo, r);
      const returning = visitors.length > 30 && r() < 0.24;
      const device = weighted(r, DEMO_DEVICES);
      let visitor: (typeof visitors)[number];
      if (returning) {
        visitor = pick(r, visitors);
        visitor.sessions += 1;
        if (start > visitor.lastSeenAt) visitor.lastSeenAt = start;
      } else {
        visitor = {
          id: id(r, "v_demo"),
          country: weighted(r, DEMO_COUNTRIES),
          firstSeenAt: start,
          lastSeenAt: start,
          sessions: 1,
          isDemo: true,
        };
        visitors.push(visitor);
      }
      const channel = weighted(r, DEMO_CHANNELS);
      const refs = DEMO_REFERRERS[channel] ?? [];
      const sid = id(r, "s_demo");

      // Build the page path for this session.
      const pages: { path: string; product?: ProductLite; category?: string }[] = [];
      const landing = weighted(r, [
        ["home", 44],
        ["product", 26],
        ["category", 14],
        ["studio", 5],
        ["oem", 5],
        ["guide", 6],
      ] as const);
      const depth = 1 + Math.min(9, Math.floor(-Math.log(1 - r()) * 2.4));
      for (let i = 0; i < depth; i++) {
        const kind = i === 0 ? landing : weighted(r, [["product", 46], ["category", 20], ["home", 8], ["studio", 7], ["oem", 6], ["factory", 7], ["quote", 6]] as const);
        if (kind === "product") {
          const product = weighted(r, productWeights);
          pages.push({ path: `/products/${product.slug}`, product });
        } else if (kind === "category") {
          const cat = pick(r, categorySlugs);
          pages.push({ path: `/products/c/${cat}`, category: cat });
        } else {
          const path = { home: "/", studio: "/design-studio", oem: "/oem", guide: "/insights/sublimation-vs-screen-printing-team-kits", factory: "/factory", quote: "/quote" }[kind];
          pages.push({ path });
        }
      }

      let t = start.getTime();
      const push = (name: string, path: string, extra: Partial<Prisma.EventCreateManyInput> = {}) => {
        t += 4_000 + Math.floor(r() * 50_000);
        events.push({ sessionId: sid, visitorId: visitor.id, name, path, createdAt: new Date(Math.min(t, Date.now())), isDemo: true, ...extra });
      };

      let addedToCart: ProductLite | null = null;
      for (const page of pages) {
        push("page_view", page.path);
        if (page.product) {
          push("product_view", page.path, { productId: page.product.id, category: page.product.category });
          if (page.product.purchaseMode !== "QUOTE" && r() < 0.075) {
            addedToCart = page.product;
            push("add_to_cart", page.path, { productId: page.product.id, value: page.product.priceTiers[0]?.unitCents ?? 0 });
          }
          if (r() < 0.025) {
            push("quote_start", page.path, { productId: page.product.id });
            if (r() < 0.4) {
              quotes.push({ at: new Date(t), sessionId: sid, product: page.product, source: "PRODUCT_PAGE", country: visitor.country });
              push("quote_submit", "/quote", { productId: page.product.id });
            }
          }
          if (r() < 0.04) push("whatsapp_click", page.path, { productId: page.product.id, label: "Product WhatsApp" });
          if (r() < 0.01) push("spec_download", page.path, { productId: page.product.id });
        }
        if (page.category) push("category_view", page.path, { category: page.category });
        if (page.path === "/design-studio") {
          push("customizer_start", page.path);
          if (r() < 0.08) {
            push("customizer_complete", page.path);
            quotes.push({ at: new Date(t), sessionId: sid, product: catalog.find((p) => p.slug === "custom-sublimated-football-kit") ?? null, source: "DESIGN_STUDIO", country: visitor.country });
            push("quote_submit", page.path);
          }
        }
        if (page.path === "/quote" && r() < 0.25) {
          push("quote_start", page.path);
          if (r() < 0.3) {
            quotes.push({ at: new Date(t), sessionId: sid, product: null, source: "QUOTE_FORM", country: visitor.country });
            push("quote_submit", page.path);
          }
        }
        if (r() < 0.28) push("nav_click", page.path, { label: pick(r, ["Products", "Design Studio", "OEM & Private Label", "Factory", "Contact"]) });
        if (r() < 0.1) push("cta_click", page.path, { label: pick(r, ["Request a quote", "Browse products", "Design your kit", "See the factory"]) });
      }
      if (r() < 0.05) push("search", "/products", { label: pick(r, ["football kit", "race suit", "gloves", "leather jacket", "kart suit", "goalkeeper", "custom jersey"]) });
      if (r() < 0.045) push("filter_use", "/products", { label: pick(r, ["category", "price", "moq", "sort"]) });
      if (r() < 0.035) push("whatsapp_click", pages[0]!.path, { label: "Floating WhatsApp" });
      if (r() < 0.01) push("email_click", "/contact");
      if (r() < 0.006) push("phone_click", "/contact");
      if (r() < 0.06) push("video_play", "/factory", { label: "Factory tour" });
      if (r() < 0.03) push("oem_cta", "/oem");
      if (r() < 0.03) {
        push("finder_start", "/");
        if (r() < 0.6) push("finder_complete", "/");
      }
      if (r() < 0.05) {
        push("ai_chat_start", pages[0]!.path);
        const msgs = 1 + Math.floor(r() * 4);
        for (let m = 0; m < msgs; m++) push("ai_message", pages[0]!.path);
        if (r() < 0.1) {
          quotes.push({ at: new Date(t), sessionId: sid, product: null, source: "AI_ASSISTANT", country: visitor.country });
          push("ai_lead_created", pages[0]!.path);
        }
      }
      if (addedToCart && r() < 0.5) {
        push("checkout_start", "/checkout", { productId: addedToCart.id });
        if (r() < 0.42) {
          const qty = addedToCart.purchaseMode === "BOTH" && r() < 0.55 ? 1 : Math.max(addedToCart.moq, pick(r, [10, 20, 25, 50, 100]));
          purchases.push({ at: new Date(t), sessionId: sid, product: addedToCart, qty, country: visitor.country });
          push("purchase", "/checkout", { productId: addedToCart.id, value: unitPrice(addedToCart.priceTiers, qty) * qty });
        }
      }

      sessions.push({
        id: sid,
        visitorId: visitor.id,
        startedAt: start,
        lastSeenAt: new Date(Math.min(t, Date.now())),
        landingPath: pages[0]!.path,
        lastPath: pages[pages.length - 1]!.path,
        pageViews: pages.length,
        referrerHost: refs.length ? pick(r, refs) : null,
        channel,
        utmSource: channel === "paid" ? "google" : channel === "email" ? "newsletter" : null,
        utmMedium: channel === "paid" ? "cpc" : channel === "email" ? "email" : null,
        device,
        browser: weighted(r, DEMO_BROWSERS[device]!),
        os: weighted(r, DEMO_OS[device]!),
        country: visitor.country,
        isReturning: returning,
        isBot: false,
        isDemo: true,
      });
    }
  }

  // Insert analytics in chunks.
  for (let i = 0; i < visitors.length; i += 1000) await db.visitor.createMany({ data: visitors.slice(i, i + 1000) });
  for (let i = 0; i < sessions.length; i += 1000) await db.session.createMany({ data: sessions.slice(i, i + 1000) });
  for (let i = 0; i < events.length; i += 2000) await db.event.createMany({ data: events.slice(i, i + 2000) });
  console.log(`demo analytics: ${visitors.length} visitors, ${sessions.length} sessions, ${events.length} events`);

  // Customers from demo companies.
  const customers = [];
  for (const [i, c] of DEMO_COMPANIES.entries()) {
    customers.push(
      await db.customer.create({
        data: {
          email: `demo${i + 1}@example.com`,
          name: c.contact,
          company: c.name,
          country: c.country,
          phone: null,
          source: i % 3 === 0 ? "ORDER" : "QUOTE",
          isDemo: true,
          createdAt: new Date(Date.now() - (50 - i * 3) * 86_400_000),
        },
      }),
    );
  }

  // Orders from simulated purchases.
  const admins = await db.adminUser.findMany();
  const owner = admins.find((a) => a.role === "OWNER");
  const sales = admins.find((a) => a.role === "SALES");
  let orderSeq = 1;
  for (const p of purchases) {
    const ageDays = (Date.now() - p.at.getTime()) / 86_400_000;
    const status =
      ageDays > 32 ? "DELIVERED" : ageDays > 24 ? "SHIPPED" : ageDays > 12 ? "MANUFACTURING" : ageDays > 6 ? "PROCESSING" : ageDays > 2 ? "CONFIRMED" : "PENDING";
    const finalStatus = r() < 0.06 && ageDays > 5 ? "CANCELLED" : status;
    const paymentStatus =
      finalStatus === "CANCELLED" ? "REFUNDED" : ["DELIVERED", "SHIPPED"].includes(finalStatus) ? "PAID" : finalStatus === "MANUFACTURING" ? "PARTIALLY_PAID" : finalStatus === "PENDING" ? "UNPAID" : "PENDING";
    const shippingStatus = finalStatus === "DELIVERED" ? "DELIVERED" : finalStatus === "SHIPPED" ? "IN_TRANSIT" : "NOT_SHIPPED";
    const customer = pick(r, customers);
    const unit = unitPrice(p.product.priceTiers, p.qty);
    const isSample = p.qty === 1;
    const total = unit * p.qty;
    const yymmdd = p.at.toISOString().slice(2, 10).replace(/-/g, "");
    await db.order.create({
      data: {
        orderNumber: `GL-${yymmdd}-D${String(orderSeq++).padStart(3, "0")}`,
        customerId: customer.id,
        status: finalStatus,
        paymentStatus,
        shippingStatus,
        paymentMethod: r() < 0.65 ? "bank_transfer" : "invoice_link",
        subtotalCents: total,
        totalCents: total,
        contactName: customer.name,
        contactEmail: customer.email,
        company: customer.company,
        shipLine1: "Demo address",
        shipCity: "Demo City",
        shipCountry: customer.country ?? p.country,
        carrier: shippingStatus !== "NOT_SHIPPED" ? pick(r, ["DHL Express", "FedEx", "Sea freight"]) : null,
        trackingNumber: shippingStatus !== "NOT_SHIPPED" ? `DEMO${Math.floor(r() * 1e9)}` : null,
        sessionId: p.sessionId,
        isDemo: true,
        createdAt: p.at,
        items: {
          create: [
            {
              productId: p.product.id,
              nameSnapshot: p.product.name,
              skuSnapshot: p.product.sku,
              imageSnapshot: p.product.image,
              size: isSample ? "M" : "Mixed",
              isSample,
              quantity: p.qty,
              unitCents: unit,
              totalCents: total,
            },
          ],
        },
        events: {
          create: [
            { kind: "created", toValue: "PENDING", createdAt: p.at },
            ...(finalStatus !== "PENDING"
              ? [{ kind: "status", fromValue: "PENDING", toValue: finalStatus, actorEmail: owner?.email ?? null, createdAt: new Date(p.at.getTime() + 2 * 86_400_000) }]
              : []),
          ],
        },
      },
    });
  }

  // Leads from simulated quote submissions.
  let leadSeq = 1;
  const qtyFor = (product: ProductLite | null) => (product ? Math.max(product.moq, pick(r, [10, 15, 20, 25, 30, 50, 75, 100, 200, 500])) : pick(r, [20, 50, 100, 250]));
  for (const q of quotes) {
    const ageDays = (Date.now() - q.at.getTime()) / 86_400_000;
    const status =
      ageDays > 30 ? weighted(r, [["WON", 4], ["LOST", 3], ["QUOTED", 2]] as const)
      : ageDays > 12 ? weighted(r, [["QUOTED", 4], ["NEGOTIATING", 3], ["QUALIFIED", 2], ["LOST", 1]] as const)
      : ageDays > 3 ? weighted(r, [["CONTACTED", 4], ["QUALIFIED", 3], ["QUOTED", 1]] as const)
      : weighted(r, [["NEW", 5], ["CONTACTED", 2]] as const);
    const customer = pick(r, customers);
    const yymmdd = q.at.toISOString().slice(2, 10).replace(/-/g, "");
    const product = q.product ?? (q.source === "AI_ASSISTANT" || q.source === "QUOTE_FORM" ? weighted(r, productWeights) : null);
    const quantity = qtyFor(product);
    await db.lead.create({
      data: {
        leadNumber: `RFQ-${yymmdd}-D${String(leadSeq++).padStart(3, "0")}`,
        status,
        source: q.source as never,
        customerId: customer.id,
        name: customer.name,
        email: customer.email,
        company: customer.company,
        country: customer.country ?? q.country,
        preferredChannel: weighted(r, [["whatsapp", 5], ["email", 4], ["phone", 1]] as const),
        productId: product?.id ?? null,
        productName: product?.name ?? null,
        category: product?.category ?? null,
        quantity,
        requirements: {
          branding: pick(r, ["Crest + sponsor", "Logo on back of hand", "Private label + hang tags", "Names and numbers", "Embroidered logo"]),
          colors: pick(r, ["Navy and gold", "Club red/white", "Black / fluo yellow", "Match our existing kit", "Open to suggestions"]),
          sizes: pick(r, ["S–XL mixed", "Youth + adult", "Made to measure", "M–2XL"]),
        },
        budget: pick(r, ["Flexible", "Under $15/unit", "$15–25/unit", "Around $300/suit", null]),
        targetDate: pick(r, ["Before season start", "6 weeks", "Next month", "No rush", null]),
        message: "Demo enquiry generated for the client review.",
        aiSummary:
          q.source === "AI_ASSISTANT"
            ? `Captured by the AI assistant. ${customer.company} wants about ${quantity} units${product ? ` of ${product.name}` : ""}; prefers a quick sample first.`
            : null,
        assignedToId: status === "NEW" ? null : (r() < 0.6 ? sales?.id : owner?.id) ?? null,
        sessionId: q.sessionId,
        isDemo: true,
        createdAt: q.at,
      },
    });
  }
  console.log(`demo records: ${customers.length} customers, ${purchases.length} orders, ${quotes.length} leads`);
}

async function main() {
  await seedSettings();
  await seedCatalogue();
  await seedContent();
  await seedAdmins();
  if (WITH_DEMO) await seedDemo();
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
