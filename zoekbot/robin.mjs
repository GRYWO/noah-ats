// Robin-zoekopdracht via Playwright met een persistent browserprofiel.
//
// Log éénmalig handmatig in als Yorith (npm run login:robin); daarna blijft de
// sessie bewaard in ROBIN_PROFIEL_DIR en kan de bot headless zoeken.

import { chromium } from "playwright";
import path from "node:path";
import { writeFileSync } from "node:fs";
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

// Lees telefoon, woonplaats, profieltekst en (indien aanwezig) een CV-link van
// één kandidaat-detailpagina. Best-effort; Robin-selectors kunnen afwijken.
async function leesKandidaatDetail(context, url) {
  const dp = await context.newPage();
  try {
    await dp.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await dp.waitForTimeout(2000);
    return await dp.evaluate(() => {
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;
      const bron = (document.body.innerText || "") + " " + (document.body.innerHTML || "");
      const tel = (bron.match(TEL) || [null])[0];

      // Woonplaats: zoek naar een label/veld met 'woonplaats'/'plaats'/'locatie'.
      let plaats = "";
      for (const el of document.querySelectorAll("*")) {
        const t = clean(el.textContent);
        const m = t.match(/(?:woonplaats|locatie|plaats)\s*[:\-]?\s*([A-Za-zÀ-ÿ' -]{2,40})/i);
        if (m && el.children.length === 0) { plaats = clean(m[1]); break; }
      }

      // CV-link: download-link of pdf.
      let cv_url = "";
      const cvLink = document.querySelector('a[download], a[href$=".pdf" i], a[href*="cv" i], a[href*="resume" i]');
      if (cvLink) cv_url = cvLink.href || "";

      // Profieltekst: grootste zinvolle tekstblok.
      let beste = "";
      for (const el of document.querySelectorAll("article, main, section, [class*='profile' i], [class*='content' i], div")) {
        const t = clean(el.textContent);
        if (t.length > beste.length && t.length < 6000) beste = t;
      }

      return { telefoon: tel ? clean(tel) : "", plaats, cv_url, profiel_tekst: beste.slice(0, 4000) };
    });
  } catch {
    return { telefoon: "", plaats: "", cv_url: "", profiel_tekst: "" };
  } finally {
    await dp.close().catch(() => {});
  }
}

export async function runRobinZoek(zoekterm, opties = {}) {
  const straal = Number(opties.straal) || 40;
  const plaats = (opties.plaats || "").toString().trim();
  // Robin is een natuurlijke-taal zoekbalk: locatie + straal meegeven in de tekst.
  const query = plaats ? `${zoekterm} in ${plaats} (binnen ${straal} km)` : zoekterm;

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
    await veld.fill(query);

    // Robin's veld is een TEXTAREA: Enter voegt een regel toe i.p.v. zoeken.
    // De zoekknop (aria-label "Zoeken") klikken start de zoekopdracht echt.
    const zoekKnop = await vindZichtbaarVeld(page, [
      'button[aria-label="Zoeken" i]',
      'button[aria-label*="zoek" i]',
      'button[title*="zoek" i]',
    ]);
    if (zoekKnop) {
      await zoekKnop.click().catch(() => {});
    } else {
      await veld.press("Enter").catch(() => {});
    }

    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(7000); // wachten tot de resultaten geladen zijn
    await page.screenshot({ path: "debug-robin-resultaten.png", fullPage: true }).catch(() => {});

    // Diagnose: tel elementen, dump body-tekst + brede DOM-samples zodat we
    // precies zien wat er na het zoeken op de pagina staat.
    try {
      const diag = await page.evaluate(() => {
        const t = (s) => document.querySelectorAll(s).length;
        const counts = {
          div: t("div"), a: t("a"), img: t("img"), button: t("button"),
          li: t("li"), article: t("article"), tr: t("tr"),
          iframe: t("iframe"), cssClass: t("[class^='css-']"),
        };
        const bodyText = (document.body.innerText || "").replace(/\s+/g, " ").trim();
        // Kandidaat-achtige blokken: bevatten een link of afbeelding + wat tekst.
        const samples = [];
        const blokken = [...document.querySelectorAll("div")].filter((d) => {
          const tx = (d.textContent || "").replace(/\s+/g, " ").trim();
          return d.querySelector("a, img") && tx.length > 20 && tx.length < 400 && d.children.length <= 10;
        });
        for (const el of blokken.slice(0, 6)) samples.push(el.outerHTML.replace(/\s+/g, " ").slice(0, 1500));
        return { counts, bodyLen: bodyText.length, bodySample: bodyText.slice(0, 1200), samples };
      });
      console.log("[robin] diagnose:", JSON.stringify(diag.counts), "bodyLen:", diag.bodyLen);
      console.log("[robin] body-sample:", diag.bodySample);
      writeFileSync(
        "debug-robin-rijen.txt",
        "COUNTS: " + JSON.stringify(diag.counts) + "\n\nBODY:\n" + diag.bodySample + "\n\nSAMPLES:\n" + diag.samples.join("\n\n====\n\n"),
      );
      console.log("[robin] diagnose opgeslagen: debug-robin-rijen.txt");
    } catch {}

    // Kandidaten scrapen — heuristisch, finetune na de eerste zichtbare test.
    const kandidaten = await page.evaluate(() => {
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      function norm(el) {
        try {
          return clean(el.getAttribute("aria-label") || el.textContent || "");
        } catch {
          return "";
        }
      }
      const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;
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
        const tekst = clean(k.textContent);
        const tel = (tekst.match(TEL) || [null])[0];
        out.push({ naam, url: href, telefoon: tel || "", profiel_tekst: tekst.slice(0, 1200) });
        if (out.length >= 50) break;
      }
      return out;
    });

    // Detailpagina's uitlezen (telefoon/woonplaats/CV/profiel) in kleine batches.
    const MAX_DETAIL = 20;
    const BATCH = 4;
    const teLezen = kandidaten.slice(0, MAX_DETAIL).filter((k) => k.url);
    for (let i = 0; i < teLezen.length; i += BATCH) {
      const groep = teLezen.slice(i, i + BATCH);
      const res = await Promise.all(groep.map((k) => leesKandidaatDetail(context, k.url)));
      groep.forEach((k, j) => {
        const d = res[j];
        if (!k.telefoon && d.telefoon) k.telefoon = d.telefoon;
        if (d.plaats) k.plaats = d.plaats;
        if (d.cv_url) k.cv_url = d.cv_url;
        if (d.profiel_tekst && d.profiel_tekst.length > (k.profiel_tekst || "").length) k.profiel_tekst = d.profiel_tekst;
      });
    }

    return kandidaten;
  } finally {
    await context.close();
  }
}
