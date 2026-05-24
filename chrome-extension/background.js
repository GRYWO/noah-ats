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

async function fetchMetTimeout(url, opts = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

chrome.downloads.onCreated.addListener(async (item) => {
  try {
    console.log("[Noah] Download created:", { id: item.id, url: item.url, finalUrl: item.finalUrl, filename: item.filename });

    if (!isExcelLike(item)) {
      console.log("[Noah] Niet xlsx/csv, skip");
      return;
    }

    const kandidaatId = await vindActieveKandidaat();
    if (!kandidaatId) {
      console.log("[Noah] Geen /jobdigger?kandidaat tab open, skip");
      return;
    }

    console.log("[Noah] Auto-import voor kandidaat", kandidaatId);
    await uploadNaarNoah(item, kandidaatId);
  } catch (e) {
    console.error("[Noah] listener fout:", e);
  }
});

async function uploadNaarNoah(item, kandidaatId) {
  const url = item.finalUrl || item.url;
  const naam = (item.filename ? item.filename.split(/[/\\]/).pop() : "bellijst.xlsx").replace(/\s/g, "_");

  try {
    console.log("[Noah] Fetch download URL:", url);
    let blob;
    try {
      const res = await fetchMetTimeout(url, { credentials: "include" }, 15000);
      console.log("[Noah] Fetch status:", res.status);
      if (!res.ok) throw new Error("HTTP " + res.status);
      blob = await res.blob();
      console.log("[Noah] Blob size:", blob.size);
    } catch (e) {
      console.error("[Noah] Download URL fetch faalde:", e.message);
      return;
    }

    const fd = new FormData();
    fd.append("file", blob, naam);
    fd.append("kandidaat_id", kandidaatId);
    fd.append("naam", naam.replace(/\.(xlsx?|csv)$/i, ""));

    console.log("[Noah] POST naar Noah API");
    const r = await fetchMetTimeout(NOAH_API, {
      method: "POST",
      body: fd,
      credentials: "include",
    }, 20000);
    const data = await r.json().catch(() => ({}));

    if (r.ok) {
      console.log("[Noah] Import OK:", data);
    } else {
      console.error("[Noah] Upload mislukt:", r.status, data);
    }
  } catch (e) {
    console.error("[Noah] upload fout:", e);
  }
}
