// Sign in to the LOCAL admin with the test credentials from .env and screenshot pages.
//   node scripts/admin-shoot.mjs <outDir> <width> <path...>
import "dotenv/config";
import { chromium } from "@playwright/test";

const [outDir, w = "1440", ...paths] = process.argv.slice(2);
const base = process.env.SHOOT_BASE ?? "http://localhost:3000";
if (!base.startsWith("http://localhost")) throw new Error("admin-shoot only runs against localhost");
const width = Number(w);
const mobile = width < 768;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));

await page.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
await page.fill("#email", process.env.ADMIN_EMAIL);
await page.fill("#password", process.env.ADMIN_PASSWORD);
await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/admin/login"), { timeout: 60_000 }), page.click('button[type="submit"]')]);

for (const p of paths) {
  await page.goto(`${base}${p}`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(800);
  const name = p.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
  await page.screenshot({ path: `${outDir}/${name}-${width}.png`, fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(JSON.stringify({ path: p, overflowX: overflow }));
}
if (errors.length) console.log("errors:", JSON.stringify(errors.slice(0, 6)));
await browser.close();
