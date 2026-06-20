// Robin-zoekopdracht via Playwright met een persistent browserprofiel.
//
// Log éénmalig handmatig in als Yorith (npm run login:robin); daarna blijft de
// sessie bewaard in ROBIN_PROFIEL_DIR en kan de bot headless zoeken.

import { chromium } from "playwright";
import path from "node:path";
import { diagnoseVelden, vindZichtbaarVeld } from "./velden.mjs";

const PROFIEL_DIR = process.env.ROBIN_PROFIEL_DIR || path.join(process.cwd(), "robin-profiel");
const ROBIN_URL = "https://app.recruitrobin.com";

// Robin heeft een grote natuurlijke-taal zoekbalk (placeholder als
// "vb. Operator in Utrecht met MBO, ...").
const VELD_SELECTORS = [
  'textarea[placeholder*="vb." i]',
  'input[placeholder*="vb." i]',
  'textarea[placeholder*="operator" i]',
  'input[placeholder*="zoek" i]',
  'input[placeholder*="search" i]',
  '[contenteditable="true"]',
  "textarea",
  'input[type="search"]',
  'input[type="text"]',
];

export async function runRobinZoek(zoekterm) {
  const context = await chromium.launchPersistentContext(PROFIEL_DIR, {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(ROBIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await diagnoseVelden(page, "robin");

    const veld = await vindZichtbaarVeld(page, VELD_SELECTORS);
    if (!veld) throw new Error("Zoekveld niet gevonden op Robin (zie debug-robin.png + velden hierboven)");
    await veld.click();
    await veld.fill(zoekterm);
    await veld.press("Enter");
    await page.waitForTimeout(6000); // wachten tot de resultaten geladen zijn

    // Kandidaten scrapen — heuristisch, finetune na de eerste zichtbare test.
    const kandidaten = await page.evaluate(() => {
      function norm(el) {
        try {
          return (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
        } catch (_) {
          return "";
        }
      }
      const kaarten = [
        ...document.querySelectorAll('[data-testid*="candidate" i], [class*="candidate" i], article, li'),
      ];
      const gezien = new Set();
      const out = [];
      for (const k of kaarten) {
        const naam = norm(k.querySelector('h1,h2,h3,h4,[class*="name" i]') || k).slice(0, 80);
        const link = k.querySelector('a[href*="/candidate"], a[href*="/profile"], a[href]');
        const href = link ? link.href : "";
        if (!naam) continue;
        if (href && gezien.has(href)) continue;
        if (href) gezien.add(href);
        out.push({ naam, url: href });
        if (out.length >= 50) break;
      }
      return out;
    });

    return kandidaten;
  } finally {
    await context.close();
  }
}
