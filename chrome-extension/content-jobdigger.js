// Content script op jobdigger.nl: leest filters die door Noah zijn gezet
// en vult de zoekvelden automatisch in.
//
// Werkt best-effort met meerdere selector-fallbacks omdat Jobdigger zijn UI
// kan veranderen. Bij niet-vinden van velden: stille no-op, geen errors.

(function () {
  const AUTO_FILL_DELAY_MS = 800; // wacht tot Jobdigger UI gerenderd is

  function logInfo(msg, extra) {
    console.log("[Noah-Jobdigger]", msg, extra ?? "");
  }

  function vulVeld(selectorLijst, waarde) {
    if (waarde == null || waarde === "") return false;
    for (const sel of selectorLijst) {
      const el = document.querySelector(sel);
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          el.constructor.prototype,
          "value"
        )?.set;
        if (nativeSetter) nativeSetter.call(el, String(waarde));
        else el.value = String(waarde);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        logInfo(`gevuld: ${sel}`, waarde);
        return true;
      }
    }
    return false;
  }

  function vinkAan(selectorLijst) {
    for (const sel of selectorLijst) {
      const el = document.querySelector(sel);
      if (el && el.type === "checkbox" && !el.checked) {
        el.click();
        logInfo(`aangevinkt: ${sel}`);
        return true;
      }
    }
    return false;
  }

  function pasFiltersToe(filters) {
    if (!filters) return;
    logInfo("filters ontvangen", filters);

    const functieTekst = Array.isArray(filters.functies)
      ? filters.functies.join(" ")
      : filters.functies ?? "";

    // Functie / zoekterm — meerdere mogelijke selectors voor Jobdigger zoekveld
    vulVeld(
      [
        'input[name="zoekterm"]',
        'input[name="keyword"]',
        'input[name="q"]',
        'input[name="search"]',
        'input[type="search"]',
        'input[placeholder*="zoek" i]',
        'input[placeholder*="functie" i]',
        'input[placeholder*="vacature" i]',
        "#zoekterm",
        "#search-input",
      ],
      functieTekst
    );

    // Woonplaats / locatie
    vulVeld(
      [
        'input[name="plaats"]',
        'input[name="locatie"]',
        'input[name="location"]',
        'input[name="city"]',
        'input[placeholder*="plaats" i]',
        'input[placeholder*="locatie" i]',
        'input[placeholder*="stad" i]',
        "#plaats",
        "#location",
      ],
      filters.woonplaats
    );

    // Reisafstand (km)
    vulVeld(
      [
        'input[name="afstand"]',
        'input[name="reisafstand"]',
        'input[name="radius"]',
        'input[name="distance"]',
        'select[name="afstand"]',
        'select[name="radius"]',
      ],
      filters.reisafstand_km
    );

    // "Inclusief onbekend" altijd aan (gebruiker-eis)
    if (filters.inclusief_onbekend) {
      vinkAan([
        'input[name="inclusief_onbekend"]',
        'input[name="include_unknown"]',
        'input[name="onbekend"]',
        'input[id*="onbekend" i]',
        'input[id*="unknown" i]',
        'label:has-text("Inclusief onbekend") input[type="checkbox"]',
      ]);
    }
  }

  function start() {
    chrome.storage.local.get(["noah_jobdigger_filters"], (res) => {
      const filters = res.noah_jobdigger_filters;
      if (!filters) return;
      // Geef Jobdigger even tijd om te renderen
      setTimeout(() => pasFiltersToe(filters), AUTO_FILL_DELAY_MS);
    });
  }

  // Bij navigatie binnen Jobdigger opnieuw proberen
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      start();
    }
  }).observe(document, { subtree: true, childList: true });

  // Live updates vanuit Noah
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.noah_jobdigger_filters) {
      setTimeout(() => pasFiltersToe(changes.noah_jobdigger_filters.newValue), AUTO_FILL_DELAY_MS);
    }
  });

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
})();
