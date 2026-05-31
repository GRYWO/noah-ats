// Service worker: pakt Jobdigger downloads op en stuurt naar Noah ATS
// als er een /jobdigger?kandidaat=... tab openstaat.

const NOAH_API = "https://noah-ats.nl/api/bellijst/upload";
const NOAH_TAB_PATTERN = "https://noah-ats.nl/jobdigger*";

function shouldProcess(item) {
  const u = item.url || item.finalUrl || "";
  const f = item.filename || "";
  // Match xlsx/csv in filename of URL-pad
  if (/\.(xlsx|xls|csv)/i.test(f) || /\.(xlsx|xls|csv)(\?|$|#)/i.test(u)) return true;
  // Of: download van jobdigger.nl (filename komt pas later via onChanged)
  try {
    const parsed = new URL(u);
    if (parsed.hostname.endsWith("jobdigger.nl")) return true;
  } catch (_) {}
  return false;
}

async function vindActieveKandidaat() {
  // 1. Eerst proberen via open Noah-tab met ?kandidaat=
  const tabs = await chrome.tabs.query({ url: NOAH_TAB_PATTERN });
  for (const tab of tabs) {
    try {
      const u = new URL(tab.url);
      const id = u.searchParams.get("kandidaat");
      if (id) return id;
    } catch (_) {}
  }
  // 2. Fallback: laatst gemelde kandidaat in storage (max 30 min oud)
  try {
    const data = await chrome.storage.local.get(["kandidaatId", "kandidaatTs"]);
    if (data.kandidaatId && data.kandidaatTs) {
      const leeftijd = Date.now() - data.kandidaatTs;
      if (leeftijd < 30 * 60 * 1000) {
        console.log("[Noah] Gebruik onthouden kandidaat:", data.kandidaatId, "leeftijd:", Math.round(leeftijd/1000), "s");
        return data.kandidaatId;
      }
    }
  } catch (_) {}
  return null;
}

// Ontvang updates van content script op noah-ats.nl/jobdigger
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "noah-set-kandidaat" && msg.kandidaatId) {
    chrome.storage.local.set({ kandidaatId: msg.kandidaatId, kandidaatTs: Date.now() });
    console.log("[Noah] Kandidaat onthouden:", msg.kandidaatId);
  }
  if (msg?.type === "noah-set-jobdigger-filters" && msg.filters) {
    chrome.storage.local.set({ noah_jobdigger_filters: msg.filters });
    console.log("[Noah] Jobdigger-filters opgeslagen:", msg.filters);
  }
});

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

    if (!shouldProcess(item)) {
      console.log("[Noah] Geen xlsx/csv en geen jobdigger.nl, skip");
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
