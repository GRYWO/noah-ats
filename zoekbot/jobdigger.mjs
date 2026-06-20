// Jobdigger-zoekopdracht via Playwright met hetzelfde persistent profiel als
// Robin (ingelogd als Yorith, Jobdigger gekoppeld via OTYS).

import { chromium } from "playwright";
import path from "node:path";

const PROFIEL_DIR = process.env.ROBIN_PROFIEL_DIR || path.join(process.cwd(), "robin-profiel");
const JOBDIGGER_URL = process.env.JOBDIGGER_URL || "https://jobdigger.nl";

export async function runJobdiggerZoek(beroep) {
  const context = await chromium.launchPersistentContext(PROFIEL_DIR, {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(JOBDIGGER_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    const input = await page.$(
      'input[type="search"], input[placeholder*="zoek" i], input[placeholder*="search" i], input[type="text"]'
    );
    if (!input) throw new Error("Zoekveld niet gevonden op Jobdigger (selector finetunen)");
    await input.fill(beroep);
    await input.press("Enter");
    await page.waitForTimeout(5000);

    // Gevonden vacatures scrapen (heuristisch — finetune tegen de echte UI).
    const vondsten = await page.evaluate(() => {
      function norm(el) {
        try {
          return (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
        } catch (_) {
          return "";
        }
      }
      const kaarten = [
        ...document.querySelectorAll(
          '[data-testid*="vacancy" i], [class*="vacancy" i], [class*="result" i], article, li'
        ),
      ];
      const gezien = new Set();
      const out = [];
      for (const k of kaarten) {
        const titel = norm(k.querySelector('h1,h2,h3,h4,[class*="title" i]') || k).slice(0, 120);
        const bedrijf = norm(k.querySelector('[class*="company" i], [class*="bedrijf" i]')).slice(0, 120) || null;
        const plaats =
          norm(k.querySelector('[class*="location" i], [class*="plaats" i], [class*="city" i]')).slice(0, 80) || null;
        const link = k.querySelector("a[href]");
        const url = link ? link.href : "";
        if (!titel) continue;
        if (url && gezien.has(url)) continue;
        if (url) gezien.add(url);
        out.push({ titel, bedrijf, plaats, url });
        if (out.length >= 50) break;
      }
      return out;
    });

    return vondsten;
  } finally {
    await context.close();
  }
}
