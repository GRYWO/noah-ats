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

    // Kandidaten scrapen uit de resultatenlijst. Robin gebruikt emotion-classes
    // (css-...). De naam staat in '.css-1qia2qg'; de kaart eromheen bevat
    // woonplaats, afstand en de volledige ervaring/opleiding/voorkeuren.
    const kandidaten = await page.evaluate(() => {
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;

      // Naam-elementen; val terug op een bredere selector als de class wijzigt.
      let naamEls = [...document.querySelectorAll(".css-1qia2qg")];
      if (naamEls.length === 0) {
        // Terugval: zoek divs die direct gevolgd worden door 'X KM ... GELEDEN'.
        naamEls = [...document.querySelectorAll("div")].filter((d) =>
          d.children.length === 0 && /KM\b/.test(clean(d.parentElement?.textContent || "")),
        );
      }

      const out = [];
      const gezien = new Set();
      for (const ne of naamEls) {
        const naam = clean(ne.textContent).slice(0, 100);
        if (!naam || naam.length < 2) continue;

        // Kaart = voorouder met flink wat meer tekst dan alleen de naam.
        let card = ne;
        for (let i = 0; i < 6 && card.parentElement; i++) {
          card = card.parentElement;
          if (clean(card.textContent).length > naam.length + 40) break;
        }
        const txt = clean(card.textContent);
        const key = naam + "|" + txt.slice(0, 50);
        if (gezien.has(key)) continue;
        gezien.add(key);

        // Woonplaats + afstand: alles tussen de naam en het eerste 'X KM'.
        let rest = txt.startsWith(naam) ? txt.slice(naam.length).trim() : txt;
        rest = rest.replace(/^GECHECKT\s*/i, "").trim();
        const m = rest.match(/^(.*?)\s+(\d+)\s*KM\b/i);
        let plaats = "";
        let afstand = null;
        if (m) {
          plaats = clean(m[1]).split(",")[0].replace(/\s+(NL|Nederland|Netherlands)$/i, "").trim();
          afstand = Number(m[2]);
        }

        // Externe link (LinkedIn e.d.), niet de '#'-iconen.
        const a = [...card.querySelectorAll('a[href^="http"]')].find((x) => !/^#/.test(x.getAttribute("href") || ""));
        const url = a ? a.href : "";

        const tel = (txt.match(TEL) || [null])[0];

        out.push({
          naam,
          url,
          plaats,
          telefoon: tel || "",
          profiel_tekst: txt.slice(0, 4000),
          afstand_km: afstand,
        });
        if (out.length >= 50) break;
      }
      return out;
    });

    console.log(`[robin] ${kandidaten.length} kandidaten gescrapet`);
    return kandidaten;
  } finally {
    await context.close();
  }
}
