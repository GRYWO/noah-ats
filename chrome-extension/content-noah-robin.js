// Content script op noah-ats.nl/robin: leest de #noah-robin-zoek payload
// (functie + vacatureId) en stuurt die naar de achtergrond, zodat
// content-robin.js op app.recruitrobin.com de zoekopdracht kan starten.

(function () {
  function leesZoek() {
    try {
      const el = document.getElementById("noah-robin-zoek");
      if (!el) return null;
      return JSON.parse(el.textContent || "{}");
    } catch (_) {
      return null;
    }
  }

  function meldZoek() {
    try {
      if (!window.location.pathname.startsWith("/robin")) return;
      const zoek = leesZoek();
      if (zoek && zoek.functie) {
        chrome.runtime.sendMessage({ type: "noah-set-robin-zoek", zoek });
      }
    } catch (_) {}
  }

  meldZoek();
  // Soft-nav (Next.js) + payload kan na hydration verschijnen.
  window.addEventListener("popstate", meldZoek);
  if (document.readyState === "complete") {
    meldZoek();
  } else {
    window.addEventListener("load", meldZoek, { once: true });
  }
})();
