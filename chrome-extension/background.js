// Service worker: pakt Jobdigger downloads op en stuurt naar Noah ATS
// als er een /jobdigger?kandidaat=... tab openstaat.

const NOAH_API = "https://noah-ats.nl/api/bellijst/upload";
const NOAH_TAB_PATTERN = "https://noah-ats.nl/jobdigger*";
const JOBDIGGER_HOST = "jobdigger.nl";

chrome.downloads.onCreated.addListener(async (item) => {
  try {
    const url = item.url || item.finalUrl || "";
    const filename = item.filename || "";

    // Alleen Jobdigger downloads
    if (!url.includes(JOBDIGGER_HOST)) return;

    // Alleen Excel/CSV
    if (!/\.(xlsx|xls|csv)$/i.test(filename) && !/\.(xlsx|xls|csv)(\?|$)/i.test(url)) return;

    // Zoek actieve Noah-tab met kandidaat
    const tabs = await chrome.tabs.query({ url: NOAH_TAB_PATTERN });
    let kandidaatId = null;
    for (const tab of tabs) {
      try {
        const u = new URL(tab.url);
        const id = u.searchParams.get("kandidaat");
        if (id) { kandidaatId = id; break; }
      } catch (_) {}
    }

    if (!kandidaatId) {
      // Geen actieve kandidaat → laat normale download doorgaan zonder iets te doen
      return;
    }

    // Even wachten om Jobdigger de download te laten initialiseren
    setTimeout(() => uploadNaarNoah(url, filename, kandidaatId), 500);
  } catch (e) {
    console.error("Noah extensie download-listener fout:", e);
  }
});

async function uploadNaarNoah(downloadUrl, filename, kandidaatId) {
  try {
    // Haal het bestand op (browser stuurt jobdigger sessie-cookies mee)
    const res = await fetch(downloadUrl, { credentials: "include" });
    if (!res.ok) {
      console.error("Noah extensie: download fetch mislukt", res.status);
      return;
    }
    const blob = await res.blob();
    const naam = filename ? filename.split("/").pop() : "bellijst.xlsx";

    const fd = new FormData();
    fd.append("file", blob, naam);
    fd.append("kandidaat_id", kandidaatId);
    fd.append("naam", naam.replace(/\.(xlsx?|csv)$/i, ""));

    // POST naar Noah (Noah-session-cookie gaat automatisch mee)
    const r = await fetch(NOAH_API, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = await r.json().catch(() => ({}));

    if (r.ok) {
      try {
        await chrome.notifications.create({
          type: "basic",
          iconUrl: chrome.runtime.getURL("icon.png"),
          title: "Bellijst toegevoegd aan Noah",
          message: `${data.aantal ?? "?"} rijen geïmporteerd voor de kandidaat.`,
        });
      } catch (_) {
        // Notifications mogelijk niet beschikbaar — niet kritisch
      }
    } else {
      console.error("Noah extensie: upload mislukt", data);
    }
  } catch (e) {
    console.error("Noah extensie: upload fout", e);
  }
}
