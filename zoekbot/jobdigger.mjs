// Jobdigger-zoekopdracht via Playwright met hetzelfde persistent profiel als
// Robin (ingelogd als Yorith).

import { chromium } from "playwright";
import path from "node:path";
import { writeFileSync } from "node:fs";
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

    // Diagnose: toon de HTML-structuur van een paar resultaatrijen, zodat we
    // de uitlezing precies kunnen schrijven (functie/bedrijf/plaats/link/datum).
    const voorbeeldRijen = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(".cabinet-card")) {
        out.push(el.outerHTML.replace(/\s+/g, " ").slice(0, 3500));
        if (out.length >= 2) break;
      }
      return out;
    });
    console.log("[jobdigger] voorbeeld-rijen:", JSON.stringify(voorbeeldRijen));
    try {
      writeFileSync("debug-jobdigger-rijen.txt", voorbeeldRijen.join("\n\n========\n\n"));
      console.log("[jobdigger] rij-structuur opgeslagen: debug-jobdigger-rijen.txt");
    } catch (_) {}

    // Alleen ECHTE vacaturerijen uitlezen: een rij heeft een website + datum,
    // en bevat geen rommel-woorden (helpdesk, mail naar Jobdigger, etc.).
    const vondsten = await page.evaluate(() => {
      const WEB = /(?:www\.[^\s,<"]+)|\b[a-z0-9-]+\.(?:nl|com|be|jobs|co|org|eu|io|net)\b/i;
      const DATE = /\b\d{1,2}\s+(?:jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\s*['’]?\d{2}\b/i;
      const NIVEAU = /^(vmbo|mbo|hbo|wo|mbo\+|hbo\+|geen|onbekend)\b/i;
      // Nederlands telefoonnummer (mobiel of vast).
      const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;
      const ICON = /image\/svg|svg\+xml|xml version|illustrator|generator:/i;
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      const leaves = (el) =>
        [...el.querySelectorAll("*")]
          .filter((n) => n.children.length === 0 && clean(n.textContent) && !n.closest("svg") && !ICON.test(n.textContent))
          .map((n) => clean(n.textContent))
          .filter((s) => s.length > 1);

      // Echte vacaturerijen hebben class 'cabinet-card'. Fallback: oude heuristiek.
      let rijen = [...document.querySelectorAll(".cabinet-card")];
      if (rijen.length === 0) {
        rijen = [...document.querySelectorAll("div, li, tr")].filter((el) => {
          const t = clean(el.textContent);
          return t.length > 12 && t.length < 250 && WEB.test(t) && DATE.test(t);
        });
      }

      const out = [];
      const gezien = new Set();
      for (const el of rijen) {
        const t = clean(el.textContent);
        const ref = el.getAttribute("data-reference") || t;
        if (!t || gezien.has(ref)) continue;
        gezien.add(ref);

        const titelEl = el.querySelector(".cabinet-title h3, h3, h2");
        const titel = titelEl ? clean(titelEl.textContent) : (leaves(el)[0] || "");

        const url = (t.match(WEB) || [null])[0];
        const datum = (t.match(DATE) || [null])[0];
        // Telefoon: zoek in zichtbare én verborgen tekst van de hele kaart.
        const telMatch = (el.textContent.match(TEL) || el.innerHTML.match(TEL) || [null])[0];
        const telefoon = telMatch ? clean(telMatch) : null;

        const rest = leaves(el).filter(
          (s) => s && s !== titel && !WEB.test(s) && !DATE.test(s) && !NIVEAU.test(s) && !TEL.test(s)
        );
        const plaats = rest.find((s) => s.length >= 2 && s === s.toUpperCase() && /[A-ZÀ-Þ]/.test(s)) || null;
        const bedrijf = rest.find((s) => s !== plaats && /[a-zà-þ]/.test(s)) || null;

        if (!titel) continue;
        out.push({ titel, bedrijf, plaats, url, datum, telefoon });
        if (out.length >= 80) break;
      }
      return out;
    });

    return vondsten;
  } finally {
    await context.close();
  }
}
