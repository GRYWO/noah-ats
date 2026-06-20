// Robin-zoekopdracht via Playwright met een persistent browserprofiel.
//
// Log éénmalig handmatig in als Yorith (npm run login:robin); daarna blijft de
// sessie bewaard in ROBIN_PROFIEL_DIR en kan de bot headless zoeken.

import { chromium } from "playwright";
import path from "node:path";

const PROFIEL_DIR = process.env.ROBIN_PROFIEL_DIR || path.join(process.cwd(), "robin-profiel");
const ROBIN_URL = "https://app.recruitrobin.com";

export async function runRobinZoek(zoekterm) {
  const context = await chromium.launchPersistentContext(PROFIEL_DIR, {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(ROBIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    // Zoekveld vullen (selectors heuristisch — finetune tegen de echte Robin-UI).
    const input = await page.$(
      'input[type="search"], input[placeholder*="zoek" i], input[placeholder*="search" i], input[type="text"]'
    );
    if (!input) throw new Error("Zoekveld niet gevonden op Robin (selector finetunen)");
    await input.fill(zoekterm);
    await input.press("Enter");
    await page.waitForTimeout(5000); // wachten tot resultaten geladen zijn

    // Kandidaten scrapen — zelfde heuristiek als content-robin.js.
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
