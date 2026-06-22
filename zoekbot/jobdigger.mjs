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

// Lees de volledige vacaturetekst + (indien aanwezig) een telefoonnummer van één
// detailpagina. Wordt parallel in kleine batches aangeroepen voor snelheid.
async function leesDetail(context, url) {
  const dp = await context.newPage();
  try {
    await dp.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await dp.waitForTimeout(1500);
    return await dp.evaluate(() => {
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;
      const kand = [
        ...document.querySelectorAll("article, main, [class*='content' i], [class*='vacancy' i], [class*='description' i], [class*='detail' i], section, div"),
      ];
      let beste = "";
      for (const el of kand) {
        const t = clean(el.textContent);
        if (t.length > beste.length && t.length < 6000) beste = t;
      }
      const bron = (document.body.innerText || "") + " " + (document.body.innerHTML || "");
      const tel = (bron.match(TEL) || [null])[0];
      return { tekst: beste.slice(0, 4000) || null, telefoon: tel ? clean(tel) : null };
    });
  } catch {
    return { tekst: null, telefoon: null };
  } finally {
    await dp.close().catch(() => {});
  }
}

// Scrape alle op dit moment zichtbare vacaturekaarten van de resultatenpagina.
function scrapeZichtbaar(page) {
  return page.evaluate(() => {
    const WEB = /(?:www\.[^\s,<"]+)|\b[a-z0-9-]+\.(?:nl|com|be|jobs|co|org|eu|io|net)\b/i;
    const DATE = /\b\d{1,2}\s+(?:jan|feb|mrt|maa|apr|mei|jun|jul|aug|sep|okt|nov|dec)[a-z]*\s*['’]?\d{2}\b/i;
    const NIVEAU = /^(vmbo|mbo|hbo|wo|mbo\+|hbo\+|geen|onbekend)\b/i;
    const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;
    const ICON = /image\/svg|svg\+xml|xml version|illustrator|generator:/i;
    const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
    const leaves = (el) =>
      [...el.querySelectorAll("*")]
        .filter((n) => n.children.length === 0 && clean(n.textContent) && !n.closest("svg") && !ICON.test(n.textContent))
        .map((n) => clean(n.textContent))
        .filter((s) => s.length > 1);

    let rijen = [...document.querySelectorAll(".cabinet-card")];
    if (rijen.length === 0) {
      rijen = [...document.querySelectorAll("div, li, tr")].filter((el) => {
        const t = clean(el.textContent);
        return t.length > 12 && t.length < 250 && WEB.test(t) && DATE.test(t);
      });
    }

    const out = [];
    for (const el of rijen) {
      const t = clean(el.textContent);
      if (!t) continue;

      const titelEl = el.querySelector(".cabinet-title h3, h3, h2");
      const titel = titelEl ? clean(titelEl.textContent) : (leaves(el)[0] || "");

      const url = (t.match(WEB) || [null])[0];
      const datum = (t.match(DATE) || [null])[0];
      const telMatch = (el.textContent.match(TEL) || el.innerHTML.match(TEL) || [null])[0];
      const telefoon = telMatch ? clean(telMatch) : null;

      const rest = leaves(el).filter(
        (s) => s && s !== titel && !WEB.test(s) && !DATE.test(s) && !NIVEAU.test(s) && !TEL.test(s)
      );
      const plaats = rest.find((s) => s.length >= 2 && s === s.toUpperCase() && /[A-ZÀ-Þ]/.test(s)) || null;
      const bedrijf = rest.find((s) => s !== plaats && /[a-zà-þ]/.test(s)) || null;

      const detailLink = el.querySelector("a.cabinet-link, a[href*='focuscontent'], a[href]");
      let jobdigger_url = detailLink ? detailLink.getAttribute("href") : null;
      if (jobdigger_url && jobdigger_url.startsWith("/")) {
        jobdigger_url = "https://www.jobdigger.nl" + jobdigger_url;
      }

      if (!titel) continue;
      out.push({ titel, bedrijf, plaats, url, datum, telefoon, jobdigger_url });
    }
    return out;
  });
}

export async function runJobdiggerZoek(beroep, limiet = 50) {
  const doel = Math.max(1, Number(limiet) || 50);
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
    // Typeahead: teken voor teken typen triggert de suggestielijst; daarna de
    // eerste suggestie kiezen registreert de zoekterm.
    await veld.pressSequentially(beroep, { delay: 80 });
    await page.waitForTimeout(1800);
    await veld.press("ArrowDown");
    await veld.press("Enter");
    await page.waitForTimeout(1000);
    // Locatie bewust leeg laten = heel Nederland.

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

    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "debug-jobdigger-resultaten.png", fullPage: true }).catch(() => {});

    // Diagnose: structuur van een paar rijen wegschrijven.
    try {
      const voorbeeldRijen = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll(".cabinet-card")) {
          out.push(el.outerHTML.replace(/\s+/g, " ").slice(0, 3500));
          if (out.length >= 2) break;
        }
        return out;
      });
      writeFileSync("debug-jobdigger-rijen.txt", voorbeeldRijen.join("\n\n========\n\n"));
    } catch {}

    // Tot 'doel' vacatures verzamelen: scrape wat zichtbaar is, laad dan meer
    // (volgende-knop of scrollen) en herhaal. Dedup over pagina's heen.
    const alle = new Map();
    let geenGroei = 0;
    for (let ronde = 0; ronde < 40 && alle.size < doel; ronde++) {
      const batch = await scrapeZichtbaar(page);
      const voor = alle.size;
      for (const v of batch) {
        const key = v.jobdigger_url || `${v.titel}|${v.plaats || ""}`;
        if (!alle.has(key)) alle.set(key, v);
      }
      if (alle.size >= doel) break;
      geenGroei = alle.size === voor ? geenGroei + 1 : 0;
      if (geenGroei >= 3) break; // geen nieuwe resultaten meer

      // Meer laden: volgende/meer-knop klikken, anders naar beneden scrollen.
      let geklikt = false;
      for (const naam of [/volgende/i, /meer laden/i, /meer resultaten/i, /load more/i, /next/i]) {
        for (const rol of ["button", "link"]) {
          const el = page.getByRole(rol, { name: naam }).first();
          if (await el.count().catch(() => 0)) {
            await el.click({ timeout: 1500 }).catch(() => {});
            geklikt = true;
            break;
          }
        }
        if (geklikt) break;
      }
      if (!geklikt) {
        await page.mouse.wheel(0, 6000).catch(() => {});
        await page.keyboard.press("End").catch(() => {});
      }
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }

    const vondsten = [...alle.values()].slice(0, doel);
    console.log(`[jobdigger] ${vondsten.length} vacatures verzameld (doel ${doel})`);

    // Detailpagina's uitlezen (volledige tekst + telefoon) in parallelle batches
    // zodat het snel blijft, ook bij 50 vacatures.
    const BATCH = 4;
    for (let i = 0; i < vondsten.length; i += BATCH) {
      const groep = vondsten.slice(i, i + BATCH).filter((v) => v.jobdigger_url);
      const res = await Promise.all(groep.map((v) => leesDetail(context, v.jobdigger_url)));
      groep.forEach((v, k) => {
        if (res[k].tekst) v.detail_tekst = res[k].tekst;
        if (!v.telefoon && res[k].telefoon) v.telefoon = res[k].telefoon;
      });
    }

    return vondsten;
  } finally {
    await context.close();
  }
}
