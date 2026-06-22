// Noah zoekbot — draait op de altijd-aan kantoor-Mac.
//
// Pollt de ATS voor openstaande zoekopdrachten, draait ze in Robin (ingelogd
// als Yorith via een persistent browserprofiel) en meldt het resultaat terug.

import { writeFileSync } from "node:fs";
import { runRobinZoek, runRobinTelefoon } from "./robin.mjs";
import { runJobdiggerZoek } from "./jobdigger.mjs";

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
      const kandidaten = await runRobinZoek(job.zoekterm, { straal: job.straal_km || 40, plaats: job.plaats || "" });
      console.log(`  → ${kandidaten.length} kandidaten gevonden`);
      await meldResultaat(job.id, { kandidaten });
    } else if (job.type === "robin_telefoon") {
      const { telefoon, email } = await runRobinTelefoon(job.zoekterm, { plaats: job.plaats || "", naam: job.doel_naam || "" });
      console.log(`  → telefoon: ${telefoon || "(geen)"} email: ${email || "(geen)"}`);
      await meldResultaat(job.id, { telefoon, email });
    } else if (job.type === "jobdigger") {
      const vondsten = await runJobdiggerZoek(job.zoekterm, job.limiet || 50);
      console.log(`  → ${vondsten.length} vacatures gevonden`);
      await meldResultaat(job.id, { vondsten });
    } else {
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

// Heartbeat: schrijf periodiek een tijdstempel zodat je kunt zien dat de bot
// nog leeft (cat heartbeat.txt, of in de systemd-logs).
function heartbeat() {
  const stamp = new Date().toISOString();
  try {
    writeFileSync("heartbeat.txt", stamp + "\n");
  } catch (_) {}
  console.log(`[heartbeat] ${stamp}`);
}

console.log(`Noah zoekbot gestart. Pollt ${BASE} elke ${INTERVAL}ms.`);
setInterval(tick, INTERVAL);
setInterval(heartbeat, 5 * 60 * 1000);
heartbeat();
tick();
