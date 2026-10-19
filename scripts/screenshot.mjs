// Visual QA helper: node scripts/screenshot.mjs <url-path> <outDir> [light|dark] [widths...]
// Uses the locally installed Chrome (no browser download).
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const [, , urlPath = "/", outDir = "screenshots", scheme = "light", ...widthsArg] = process.argv;
const widths = widthsArg.length ? widthsArg.map(Number) : [390, 820, 1280];
const base = process.env.BASE_URL ?? "http://localhost:3000";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of widths) {
    const height = width < 600 ? 844 : width < 1000 ? 1180 : 900;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      colorScheme: scheme === "dark" ? "dark" : "light",
      locale: "kk-KZ",
    });
    if (process.env.COOKIES) {
      const cookies = JSON.parse(fs.readFileSync(process.env.COOKIES, "utf8"));
      await context.addCookies(cookies);
    }
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(base + urlPath, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(600);
    const name = `${urlPath.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}_${scheme}_${width}.png`;
    const file = path.join(outDir, name);
    await page.screenshot({ path: file, fullPage: process.env.FULL !== "0" });
    console.log(`saved ${file}${errors.length ? `  (${errors.length} console errors: ${errors.slice(0, 3).join(" | ")})` : ""}`);
    await context.close();
  }
} finally {
  await browser.close();
}
