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

    // Diagnose: vind automatisch de resultatenlijst (de container met de meeste
    // gelijke kind-divs met tekst) en dump een paar kaart-HTML's + body-tekst.
    try {
      const diag = await page.evaluate(() => {
        let beste = null;
        let besteN = 0;
        for (const el of document.querySelectorAll("div, ul, ol")) {
          const kinderen = [...el.children].filter((c) => c.tagName === "DIV" || c.tagName === "LI");
          const metTekst = kinderen.filter((c) => (c.textContent || "").trim().length > 15);
          if (metTekst.length >= 5 && metTekst.length > besteN) {
            beste = el;
            besteN = metTekst.length;
          }
        }
        const kaarten = [];
        if (beste) {
          const kids = [...beste.children].filter((c) => (c.textContent || "").trim().length > 15);
          for (const k of kids.slice(0, 3)) kaarten.push(k.outerHTML.replace(/\s+/g, " ").slice(0, 2500));
        }
        return {
          aantalKaarten: besteN,
          containerClass: beste ? beste.className : "",
          kaarten,
          body: (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 6000),
        };
      });
      console.log(`[robin] lijst gevonden met ~${diag.aantalKaarten} kaarten (container: ${diag.containerClass})`);
      writeFileSync(
        "debug-robin-rijen.txt",
        `AANTAL: ${diag.aantalKaarten}\nCONTAINER: ${diag.containerClass}\n\nKAARTEN:\n${diag.kaarten.join("\n\n==== KAART ====\n\n")}\n\nBODY:\n${diag.body}`,
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
