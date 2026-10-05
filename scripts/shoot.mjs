// Headless screenshots / canvas captures with the locally installed Chrome.
//
//   node scripts/shoot.mjs <url> <out.png> [width] [height] [--full] [--wait=ms] [--canvas]
//
// --canvas saves the largest <canvas> (WebGL needs preserveDrawingBuffer,
// which `?still` mode enables) instead of the page.
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const [url, out, w = "390", h = "844"] = args.filter((a) => !a.startsWith("--"));
const full = args.includes("--full");
const canvasOnly = args.includes("--canvas");
const wait = Number((args.find((a) => a.startsWith("--wait=")) ?? "--wait=2500").split("=")[1]);
const width = Number(w);
const height = Number(h);
const mobile = width < 768;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=default", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  viewport: { width, height },
  deviceScaleFactor: mobile ? 2 : 1,
  isMobile: mobile,
  hasTouch: mobile,
  userAgent: mobile
    ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    : undefined,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
await page.waitForTimeout(wait);
if (full) {
  // Scroll like a visitor so lazy images load and reveal animations fire.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 140));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}

if (canvasOnly) {
  const dataUrl = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll("canvas")].sort((a, b) => b.width * b.height - a.width * a.height);
    return canvases[0]?.toDataURL("image/png") ?? null;
  });
  if (!dataUrl) throw new Error("no canvas");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, Buffer.from(dataUrl.split(",")[1], "base64"));
} else {
  await page.screenshot({ path: out, fullPage: full });
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
console.log(JSON.stringify({ out, overflowX: overflow, errors: errors.slice(0, 5) }));
await browser.close();
