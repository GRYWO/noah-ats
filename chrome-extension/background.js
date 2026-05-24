// Service worker: pakt Jobdigger downloads op en stuurt naar Noah ATS
// als er een /jobdigger?kandidaat=... tab openstaat.

const NOAH_API = "https://noah-ats.nl/api/bellijst/upload";
const NOAH_TAB_PATTERN = "https://noah-ats.nl/jobdigger*";

function isExcelLike(item) {
  const f = item.filename || "";
  const u = item.url || item.finalUrl || "";
  return /\.(xlsx|xls|csv)/i.test(f) || /\.(xlsx|xls|csv)(\?|$|#)/i.test(u);
}

async function vindActieveKandidaat() {
  const tabs = await chrome.tabs.query({ url: NOAH_TAB_PATTERN });
  for (const tab of tabs) {
    try {
      const u = new URL(tab.url);
      const id = u.searchParams.get("kandidaat");
      if (id) return id;
    } catch (_) {}
  }
  return null;
}

chrome.downloads.onCreated.addListener(async (item) => {
  try {
    console.log("[Noah] Download created:", item.url, item.filename);

    if (!isExcelLike(item)) {
      console.log("[Noah] Niet xlsx/csv, skip");
      return;
    }

    const kandidaatId = await vindActieveKandidaat();
    if (!kandidaatId) {
      console.log("[Noah] Geen /jobdigger?kandidaat tab open, skip auto-import");
      return;
    }

    console.log("[Noah] Auto-import voor kandidaat", kandidaatId);
    // Wacht een fractie zodat de download URL stabiel is
    setTimeout(() => uploadNaarNoah(item, kandidaatId), 800);
  } catch (e) {
    console.error("[Noah] download-listener fout:", e);
  }
});

async function uploadNaarNoah(item, kandidaatId) {
  const url = item.finalUrl || item.url;
  const naam = (item.filename ? item.filename.split("/").pop() : "bellijst.xlsx").replace(/\s/g, "_");
  try {
    console.log("[Noah] Fetching", url);
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) {
      console.error("[Noah] Fetch download mislukt:", res.status);
      return;
    }
    const blob = await res.blob();

    const fd = new FormData();
    fd.append("file", blob, naam);
    fd.append("kandidaat_id", kandidaatId);
    fd.append("naam", naam.replace(/\.(xlsx?|csv)$/i, ""));

    console.log("[Noah] POST naar", NOAH_API);
    const r = await fetch(NOAH_API, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const data = await r.json().catch(() => ({}));

    if (r.ok) {
      console.log("[Noah] Import OK:", data);
      try {
        await chrome.notifications.create({
          type: "basic",
          iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiByeD0iMTIiIGZpbGw9IiMzMzMzOTkiLz48dGV4dCB4PSI1MCUiIHk9IjU4JSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2ZmZiIgZm9udC1zaXplPSIzMiIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXdlaWdodD0iOTAwIj5uPC90ZXh0Pjwvc3ZnPg==",
          title: "Bellijst geïmporteerd",
          message: `${data.aantal ?? "?"} rijen toegevoegd aan kandidaat in Noah.`,
        });
      } catch (e) {
        console.warn("[Noah] notificatie fout:", e);
      }
    } else {
      console.error("[Noah] Upload mislukt:", r.status, data);
    }
  } catch (e) {
    console.error("[Noah] upload fout:", e);
  }
}
