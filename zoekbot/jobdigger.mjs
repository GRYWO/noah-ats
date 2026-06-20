// Jobdigger-zoekopdracht via Playwright met hetzelfde persistent profiel als
// Robin (ingelogd als Yorith).

import { chromium } from "playwright";
import path from "node:path";
import { diagnoseVelden, vindZichtbaarVeld } from "./velden.mjs";

const PROFIEL_DIR = process.env.ROBIN_PROFIEL_DIR || path.join(process.cwd(), "robin-profiel");
const JOBDIGGER_URL = process.env.JOBDIGGER_URL || "https://www.jobdigger.nl/search/dashboard";

// Het HOOFD-zoekveld ("Zoek op functietitel(s), skills en/of organisatie(s)").
// Bewust NIET het locatie- of het trefwoorden-filterveld.
const VELD_SELECTORS = [
  'input[placeholder*="functietitel" i]',
  'input[placeholder*="skills" i]',
  'input[placeholder*="organisatie" i]',
  'input[type="text"]:not([placeholder*="locatie" i]):not([placeholder*="trefwoord" i]):not([placeholder*="branche" i]):not([placeholder*="beroepsklasse" i])',
];

export async function runJobdiggerZoek(beroep) {
  const context = await chromium.launchPersistentContext(PROFIEL_DIR, {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(JOBDIGGER_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await diagnoseVelden(page, "jobdigger");

    const veld = await vindZichtbaarVeld(page, VELD_SELECTORS);
    if (!veld) throw new Error("Hoofd-zoekveld niet gevonden op Jobdigger (zie debug-jobdigger.png + velden hierboven)");
    await veld.click();
    await veld.fill("");
    // Jobdigger's veld is een typeahead: teken voor teken typen triggert de
    // suggestielijst; daarna de eerste suggestie kiezen registreert de zoekterm.
    await veld.pressSequentially(beroep, { delay: 80 });
    await page.waitForTimeout(1800);
    await veld.press("ArrowDown");
    await veld.press("Enter");
    await page.waitForTimeout(1000);
    // Locatie bewust leeg laten = heel Nederland.

    // De zoekknop klikken (paarse vergrootglas). Mist 'ie? Dan Enter als terugval.
    const zoekKnop = await vindZichtbaarVeld(page, [
      "button.search-v3__submit-bt",
      "button.search-v3__submit-btn",
      'button[type="submit"]',
    ]);
    if (zoekKnop) {
      await zoekKnop.click().catch(() => {});
    } else {
      await veld.press("Enter").catch(() => {});
    }

    // Wachten tot de resultaten geladen zijn, daarna een screenshot van de
    // resultatenpagina zodat we de echte vacaturekaarten + export kunnen zien.
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "debug-jobdigger-resultaten.png", fullPage: true }).catch(() => {});
    console.log("[jobdigger] resultaten-screenshot: debug-jobdigger-resultaten.png");

    // Gevonden vacatures scrapen (heuristisch — finetune na de eerste test).
    const vondsten = await page.evaluate(() => {
      function norm(el) {
        try {
          return (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ");
        } catch (_) {
          return "";
        }
      }
      const kaarten = [
        ...document.querySelectorAll('[data-testid*="vacancy" i], [class*="vacancy" i], [class*="result" i], article, li'),
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
