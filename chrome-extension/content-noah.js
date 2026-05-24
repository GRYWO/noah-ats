// Content script op noah-ats.nl: leest ?kandidaat= en stuurt naar background
// zodat de extensie weet voor welke kandidaat downloads moeten.

(function () {
  function meldKandidaat() {
    try {
      const url = new URL(window.location.href);
      if (!url.pathname.startsWith("/jobdigger")) return;
      const id = url.searchParams.get("kandidaat");
      if (!id) return;
      chrome.runtime.sendMessage({ type: "noah-set-kandidaat", kandidaatId: id });
    } catch (_) {}
  }
  meldKandidaat();
  // Soms wordt URL met soft-nav aangepast (Next.js); luister daarop
  window.addEventListener("popstate", meldKandidaat);
})();
