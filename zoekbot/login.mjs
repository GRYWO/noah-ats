// Eenmalige handmatige login bij Robin. Opent een zichtbaar browservenster met
// het persistent profiel. Log in als Yorith en sluit daarna met Ctrl+C.
// De sessie blijft bewaard zodat de bot daarna headless kan zoeken.

import { chromium } from "playwright";
import path from "node:path";

const PROFIEL_DIR = process.env.ROBIN_PROFIEL_DIR || path.join(process.cwd(), "robin-profiel");

const context = await chromium.launchPersistentContext(PROFIEL_DIR, {
  headless: false,
  viewport: { width: 1440, height: 900 },
});
const page = context.pages()[0] || (await context.newPage());
await page.goto("https://app.recruitrobin.com");

console.log("Log nu handmatig in als Yorith bij Robin.");
console.log("Doe daarna hetzelfde voor Jobdigger als dat nodig is.");
console.log("Klaar? Sluit dit venster of druk Ctrl+C — de sessie is dan opgeslagen.");
