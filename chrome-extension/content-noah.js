// Content script op noah-ats.nl: leest ?kandidaat= + filter-payload en stuurt
// naar background zodat:
//  - de extensie weet voor welke kandidaat downloads moeten worden gekoppeld
//  - de Jobdigger-zoekfilters (functie, plaats, afstand, inclusief onbekend)
//    klaar staan om in jobdigger.nl auto-gevuld te worden.

(function () {
  function leesFilters() {
    try {
      const el = document.getElementById("noah-jobdigger-filters");
      if (!el) return null;
      return JSON.parse(el.textContent || "{}");
    } catch (_) {
      return null;
    }
  }

  function meldKandidaat() {
    try {
      const url = new URL(window.location.href);
      if (!url.pathname.startsWith("/jobdigger")) return;
      const id = url.searchParams.get("kandidaat");
      if (!id) return;

      chrome.runtime.sendMessage({ type: "noah-set-kandidaat", kandidaatId: id });

      const filters = leesFilters();
      if (filters) {
        chrome.runtime.sendMessage({
          type: "noah-set-jobdigger-filters",
          filters: filters,
        });
      }
    } catch (_) {}
  }

  meldKandidaat();
  // Soft-nav (Next.js)
  window.addEventListener("popstate", meldKandidaat);

  // Initial DOM ready: filter-payload kan na hydration verschijnen
  if (document.readyState === "complete") {
    meldKandidaat();
  } else {
    window.addEventListener("load", meldKandidaat, { once: true });
  }
})();
