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
  // Robin is een natuurlijke-taal zoekbalk. We zoeken op functie + plaats; de
  // straal (40 km) geven we als hint mee.
  const query = plaats ? `${zoekterm} ${plaats} binnen ${straal} km` : zoekterm;

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

    // Kandidaten scrapen. De naam staat in '.css-1qia2qg'; we lopen omhoog naar
    // het volledige kandidaatblok (dat 'X KM' of 'GELEDEN' bevat) zodat we ook
    // woonplaats + volledige ervaring meekrijgen. Blokken zonder die markers
    // (zoals de opgeslagen zoekopdrachten in de zijbalk) slaan we over.
    const kandidaten = await page.evaluate(() => {
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;

      const naamEls = [...document.querySelectorAll(".css-1qia2qg")];
      const out = [];
      const gezien = new Set();
      for (const ne of naamEls) {
        const naam = clean(ne.textContent).slice(0, 100);
        if (!naam || naam.length < 2) continue;

        // Omhoog naar het volledige kandidaatblok (mét ervaring/opleiding), maar
        // niet zo ver dat we de hele lijst pakken (grootte-grens).
        let beste = null;
        let blok = ne;
        for (let i = 0; i < 10 && blok.parentElement; i++) {
          blok = blok.parentElement;
          const t = clean(blok.textContent);
          if (t.length > 3000) break; // te groot = de hele lijst
          if (/\d+\s*KM\b/i.test(t) || /GELEDEN/i.test(t)) beste = blok;
          if (/ervaring|opleiding|voorkeuren/i.test(t)) {
            beste = blok;
            break; // volledige kandidaatrij
          }
        }
        if (!beste) continue; // zijbalk / niet-kandidaat overslaan

        const txt = clean(beste.textContent);
        const key = naam + "|" + txt.slice(0, 60);
        if (gezien.has(key)) continue;
        gezien.add(key);

        let rest = txt.startsWith(naam) ? txt.slice(naam.length).trim() : txt;
        rest = rest.replace(/^GECHECKT\s*/i, "").trim();
        const m = rest.match(/^(.*?)\s+(\d+)\s*KM\b/i);
        let plaats = "";
        let afstand = null;
        if (m) {
          plaats = clean(m[1]).split(",")[0].replace(/\s+(NL|Nederland|Netherlands)$/i, "").trim();
          afstand = Number(m[2]);
        }

        const a = [...beste.querySelectorAll('a[href^="http"]')].find((x) => !/^#/.test(x.getAttribute("href") || ""));
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

// Telefoon onthullen voor één kandidaat: opnieuw zoeken, de kandidaat met de
// juiste naam aanklikken, 'contact onthullen' klikken en het nummer scrapen.
// Schrijft een diagnose weg (debug-robin-profiel.txt) zodat de reveal-knop
// getuned kan worden tegen de echte Robin-profielpagina.
export async function runRobinTelefoon(zoekterm, opties = {}) {
  const plaats = (opties.plaats || "").toString().trim();
  const naam = (opties.naam || "").toString().trim();
  const query = plaats ? `${zoekterm} ${plaats} binnen 40 km` : zoekterm;

  const context = await chromium.launchPersistentContext(PROFIEL_DIR, {
    headless: process.env.HEADLESS !== "false",
    viewport: { width: 1440, height: 900 },
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto(ROBIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const veld = await vindZichtbaarVeld(page, VELD_SELECTORS);
    if (!veld) throw new Error("Zoekveld niet gevonden op Robin");
    await veld.click();
    await veld.fill(query);
    const zoekKnop = await vindZichtbaarVeld(page, ['button[aria-label="Zoeken" i]', 'button[aria-label*="zoek" i]']);
    if (zoekKnop) await zoekKnop.click().catch(() => {});
    else await veld.press("Enter").catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(7000);

    // De kandidaatkaart met deze naam aanklikken om het profiel te openen.
    let geklikt = false;
    if (naam) {
      const loc = page.locator(".css-1qia2qg", { hasText: naam }).first();
      if (await loc.count().catch(() => 0)) {
        await loc.click().catch(() => {});
        geklikt = true;
      }
    }
    await page.waitForTimeout(3500);
    await page.screenshot({ path: "debug-robin-profiel.png", fullPage: true }).catch(() => {});

    // 'Contact onthullen'-knop zoeken en klikken (best effort).
    for (const re of [/onthul/i, /toon (telefoon|nummer|contact)/i, /bekijk (telefoon|contact)/i, /contactgegevens/i, /reveal/i, /show (phone|contact)/i]) {
      const knop = page.getByRole("button", { name: re }).first();
      if (await knop.count().catch(() => 0)) {
        await knop.click().catch(() => {});
        await page.waitForTimeout(2500);
        break;
      }
    }

    const res = await page.evaluate(() => {
      const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
      const TEL = /(?:\+31[\s-]?|0)(?:6[\s-]?\d{8}|\d{2,3}[\s-]?\d{6,7})/;
      const MAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
      const bron = (document.body.innerText || "") + " " + (document.body.innerHTML || "");
      const tel = (bron.match(TEL) || [null])[0];
      const mail = (bron.match(MAIL) || [null])[0];
      const knoppen = [...document.querySelectorAll("button")]
        .map((b) => clean(b.getAttribute("aria-label") || b.textContent || b.title || ""))
        .filter(Boolean)
        .slice(0, 50);
      return {
        telefoon: tel ? clean(tel) : "",
        email: mail ? clean(mail) : "",
        body: clean(document.body.innerText || "").slice(0, 4000),
        knoppen,
      };
    });

    try {
      writeFileSync(
        "debug-robin-profiel.txt",
        `GEKLIKT: ${geklikt}\nNAAM: ${naam}\nTEL: ${res.telefoon}\n\nKNOPPEN:\n${JSON.stringify(res.knoppen)}\n\nBODY:\n${res.body}`,
      );
    } catch {}
    console.log(`[robin-telefoon] ${naam}: geklikt=${geklikt} telefoon=${res.telefoon || "(geen)"} email=${res.email || "(geen)"}`);
    return { telefoon: res.telefoon, email: res.email };
  } finally {
    await context.close();
  }
}
