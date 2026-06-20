// Noah zoekbot — draait op de altijd-aan kantoor-Mac.
//
// Pollt de ATS voor openstaande zoekopdrachten, draait ze in Robin (ingelogd
// als Yorith via een persistent browserprofiel) en meldt het resultaat terug.

import { runRobinZoek } from "./robin.mjs";

const BASE = process.env.NOAH_BASE_URL || "https://noah-ats.nl";
const SECRET = process.env.BOT_SECRET;
const INTERVAL = Number(process.env.POLL_INTERVAL_MS || 5000);

if (!SECRET) {
  console.error("BOT_SECRET ontbreekt. Zet 'm in .env (zelfde waarde als in de ATS).");
  process.exit(1);
}

async function haalJob() {
  const r = await fetch(`${BASE}/api/bot/jobs`, { headers: { "x-bot-secret": SECRET } });
  if (!r.ok) {
    console.error("Job ophalen mislukt:", r.status);
    return null;
  }
  const data = await r.json();
  return data.job || null;
}

async function meldResultaat(jobId, payload) {
  const r = await fetch(`${BASE}/api/bot/jobs/resultaat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-bot-secret": SECRET },
    body: JSON.stringify({ jobId, ...payload }),
  });
  if (!r.ok) {
    console.error("Resultaat melden mislukt:", r.status, await r.text().catch(() => ""));
  } else {
    console.log("Resultaat gemeld voor job", jobId);
  }
}

async function verwerk(job) {
  console.log(`Opdracht ${job.id}: ${job.type} "${job.zoekterm}"`);
  try {
    if (job.type === "robin") {
      const kandidaten = await runRobinZoek(job.zoekterm);
      console.log(`  → ${kandidaten.length} kandidaten gevonden`);
      await meldResultaat(job.id, { kandidaten });
    } else {
      // 'jobdigger' volgt in stap 2/3.
      await meldResultaat(job.id, { fout: `Type nog niet ondersteund: ${job.type}` });
    }
  } catch (e) {
    console.error("  Verwerken mislukt:", e);
    await meldResultaat(job.id, { fout: e?.message || String(e) });
  }
}

let bezig = false;
async function tick() {
  if (bezig) return; // niet overlappen
  bezig = true;
  try {
    const job = await haalJob();
    if (job) await verwerk(job);
  } catch (e) {
    console.error("Tick-fout:", e);
  } finally {
    bezig = false;
  }
}

console.log(`Noah zoekbot gestart. Pollt ${BASE} elke ${INTERVAL}ms.`);
setInterval(tick, INTERVAL);
tick();
