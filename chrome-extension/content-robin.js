// Content script op app.recruitrobin.com (Robin).
//
// Doel: op de kandidaatkaart de "Bellen"-knop vinden, aanklikken en de
// onthulde contactgegevens (tel:/mailto:) uitlezen, zodat Noah ATS deze
// direct kan overnemen.
//
// LET OP: dit bestand is GERECONSTRUEERD uit de NOAH-DIAG-diagnostiek nadat
// het origineel (extensie 1.7.13) verloren ging. De selectors zijn een
// best-effort op basis van de bekende logica — finetune ze zo nodig tegen
// de live RecruitRobin-pagina.

(function () {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Genormaliseerde, doorzoekbare tekst van een element.
  function norm(el) {
    try {
      return (el.getAttribute("aria-label") || el.textContent || "")
        .trim()
        .replace(/\s+/g, " ");
    } catch (_) {
      return "";
    }
  }

  function alleKnoppen() {
    return [...document.querySelectorAll('button, [role="button"], a')];
  }

  function telLinks(root) {
    return [...root.querySelectorAll('a[href^="tel:"]')].map((a) => a.href).slice(0, 5);
  }

  function mailLinks(root) {
    return [...root.querySelectorAll('a[href^="mailto:"]')].map((a) => a.href).slice(0, 5);
  }

  // Kern: zoek de bel-knop, klik, en lees voor/na de contactgegevens uit.
  async function diagnose() {
    const rep = {};
    try {
      const btns = alleKnoppen();
      const bel = btns.filter((b) => /\bbel\b|bellen/i.test(norm(b)));
      rep.belGevonden = bel.length;
      rep.belVoorbeeld = bel.slice(0, 5).map(norm);

      // Situatie vóór de klik.
      rep.telNu = telLinks(document);
      rep.mailNu = mailLinks(document);

      // Klik de eerste bel-knop: Robin onthult dan vaak het telefoonnummer.
      if (bel[0]) {
        bel[0].click();
        await sleep(1000);
        rep.naKlik_tel = telLinks(document);
        rep.naKlik_mail = mailLinks(document);
      }

      // Eventuele dialoog met de contactgegevens.
      const dlg = document.querySelector('[role="dialog"]') || document.body;
      rep.dialoogTel = telLinks(dlg);
      rep.dialoogMail = mailLinks(dlg);
      rep.sluitKnoppen = [...dlg.querySelectorAll('button, [role="button"]')].filter(
        (b) => /sluit|close|x/i.test(norm(b))
      ).length;
    } catch (e) {
      rep.fout = String(e && e.message ? e.message : e);
    }

    console.log("NOAH-DIAG", JSON.stringify(rep, null, 2));
    return rep;
  }

  // Beste tel/mail uit het rapport halen.
  function beste(rep) {
    const tel =
      (rep.naKlik_tel && rep.naKlik_tel[0]) ||
      (rep.dialoogTel && rep.dialoogTel[0]) ||
      (rep.telNu && rep.telNu[0]) ||
      null;
    const mail =
      (rep.naKlik_mail && rep.naKlik_mail[0]) ||
      (rep.dialoogMail && rep.dialoogMail[0]) ||
      (rep.mailNu && rep.mailNu[0]) ||
      null;
    return { tel, mail };
  }

  // Diagnose draaien en het resultaat naar de extensie sturen, zodat Noah ATS
  // de contactgegevens kan overnemen.
  async function meldRobinContact() {
    const rep = await diagnose();
    const { tel, mail } = beste(rep);
    try {
      chrome.runtime.sendMessage({
        type: "noah-robin-contact",
        url: window.location.href,
        tel,
        mail,
        diagnose: rep,
      });
    } catch (_) {}
    return { tel, mail, rep };
  }

  console.log("Noah-Robin content script geladen op", window.location.href);

  // Op verzoek vanuit de extensie/achtergrond een diagnose draaien.
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg && msg.type === "noah-robin-diagnose") {
        meldRobinContact().then((res) => sendResponse(res));
        return true; // async antwoord
      }
    });
  } catch (_) {}

  // --- Zoekopdracht starten vanuit een Noah-vacature ("Zoek kandidaten") ---

  // Vul het zoekveld van Robin met de functie en trigger de zoekopdracht.
  function vulZoekveld(term) {
    const input =
      document.querySelector('input[type="search"]') ||
      document.querySelector('input[placeholder*="zoek" i]') ||
      document.querySelector('input[placeholder*="search" i]') ||
      document.querySelector('input[type="text"]');
    if (!input) return false;
    // React-vriendelijk de waarde zetten.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    setter.call(input, term);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", code: "Enter" }));
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter", code: "Enter" }));
    return true;
  }

  // Lees de resultatenlijst uit (naam + profiel-link). Heuristisch — finetune
  // de selectors tegen de echte RecruitRobin-resultatenpagina.
  function scrapeKandidaten() {
    const kaarten = [
      ...document.querySelectorAll(
        '[data-testid*="candidate" i], [class*="candidate" i], article, li'
      ),
    ];
    const gezien = new Set();
    const kandidaten = [];
    for (const k of kaarten) {
      const naam = norm(k.querySelector('h1,h2,h3,h4,[class*="name" i]') || k).slice(0, 80);
      const link = k.querySelector('a[href*="/candidate"], a[href*="/profile"], a[href]');
      const href = link ? link.href : "";
      if (!naam) continue;
      if (href && gezien.has(href)) continue;
      if (href) gezien.add(href);
      kandidaten.push({ naam, url: href });
      if (kandidaten.length >= 50) break;
    }
    return kandidaten;
  }

  let zoekBezig = false;

  async function startRobinZoekVanuitNoah() {
    if (zoekBezig) return;
    try {
      const data = await chrome.storage.local.get(["noah_robin_zoek", "noah_robin_zoek_ts"]);
      const zoek = data.noah_robin_zoek;
      if (!zoek || !zoek.functie) return;
      zoekBezig = true;
      // Niet ouder dan 5 minuten gebruiken.
      if (data.noah_robin_zoek_ts && Date.now() - data.noah_robin_zoek_ts > 5 * 60 * 1000) return;
      // Eenmalig verbruiken zodat het niet bij elke navigatie opnieuw start.
      await chrome.storage.local.remove(["noah_robin_zoek", "noah_robin_zoek_ts"]);

      console.log("[Noah-Robin] Start zoekopdracht voor:", zoek.functie);
      vulZoekveld(zoek.functie);
      await sleep(3000); // wachten tot de resultaten geladen zijn

      const kandidaten = scrapeKandidaten();
      console.log("NOAH-DIAG kandidaten", JSON.stringify({ aantal: kandidaten.length, kandidaten }, null, 2));
      chrome.runtime.sendMessage({
        type: "noah-robin-kandidaten",
        vacatureId: zoek.vacatureId || null,
        functie: zoek.functie,
        kandidaten,
      });
    } catch (e) {
      console.warn("[Noah-Robin] zoek-fout:", e);
    } finally {
      zoekBezig = false;
    }
  }

  // Bij laden checken of Noah een zoekopdracht heeft klaargezet.
  startRobinZoekVanuitNoah();

  // En reageren als de zoekopdracht pas ná het laden binnenkomt (race-veilig).
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.noah_robin_zoek && changes.noah_robin_zoek.newValue) {
        startRobinZoekVanuitNoah();
      }
    });
  } catch (_) {}

  // Handmatig aan te roepen in de console: window.__noahRobinDiagnose()
  window.__noahRobinDiagnose = diagnose;
  window.__noahRobinContact = meldRobinContact;
  window.__noahRobinZoek = startRobinZoekVanuitNoah;
})();
