#!/usr/bin/env node
/**
 * Automatische Migadu setup voor de Noah recruitment rebrand.
 *
 * Maakt mailboxen aan op noah-recruitment.nl voor:
 *   1. Vaste team-adressen: yorith, pepijn, wouter, bart
 *   2. Service-adressen:   info, noreply (geen user-koppeling)
 *   3. Plus ALLE bestaande users uit profiles met @grywo.nl mail-adres
 *      (voornaam@grywo.nl wordt voornaam@noah-recruitment.nl)
 *
 * Maakt forwarders aan op grywo.nl die naar de nieuwe @noah-recruitment.nl
 * mailboxen sturen. Service-adres "noreply" krijgt geen forwarder.
 *
 * Wachtwoorden worden gegenereerd en aan het eind getoond — bewaar ze
 * in je password-manager.
 *
 * GEBRUIK:
 *   export MIGADU_API_USER="yorith@grywo.nl"
 *   export MIGADU_API_KEY="je-migadu-api-key"
 *   export SUPABASE_URL="https://xxx.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="je-service-role-key"
 *   node scripts/migadu-noah-recruitment-setup.mjs
 *
 * (SUPABASE-vars zijn optioneel — zonder die wordt alleen het vaste rijtje
 *  aangemaakt; met die vars worden ook alle profile-users meegenomen.)
 *
 * Idempotent: bestaande mailbox/forwarder wordt overgeslagen.
 */

import { randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const BASE = "https://api.migadu.com/v1";
const NIEUW_DOMEIN = "noah-recruitment.nl";
const OUD_DOMEIN = "grywo.nl";

// ─── ENV: probeer ook uit .env.local te lezen als shell-vars ontbreken ───
function leesEnvLocal() {
  const pad = ".env.local";
  if (!existsSync(pad)) return;
  const inhoud = readFileSync(pad, "utf8");
  for (const regel of inhoud.split("\n")) {
    const m = regel.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}
leesEnvLocal();

const MIGADU_USER = process.env.MIGADU_API_USER;
const MIGADU_KEY = process.env.MIGADU_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!MIGADU_USER || !MIGADU_KEY) {
  console.error("\n❌ Ontbrekende env-vars MIGADU_API_USER en/of MIGADU_API_KEY.\n");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${MIGADU_USER}:${MIGADU_KEY}`).toString("base64");

// ─── HELPERS ───────────────────────────────────────────────────────

async function migadu(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: AUTH,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const tekst = await res.text();
  let data;
  try { data = tekst ? JSON.parse(tekst) : {}; } catch { data = { raw: tekst }; }
  return { ok: res.ok, status: res.status, data };
}

function maakWachtwoord() {
  return randomBytes(12).toString("base64").replace(/[+/=]/g, "").slice(0, 12) + "X9!";
}

function maakLocalPart(voornaam) {
  return (voornaam || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function mailboxBestaat(domein, local) {
  const r = await migadu(`/domains/${domein}/mailboxes/${local}`);
  return r.ok;
}

async function maakMailbox(local, naam) {
  if (await mailboxBestaat(NIEUW_DOMEIN, local)) {
    return { ok: true, alBestaat: true, local };
  }
  const wachtwoord = maakWachtwoord();
  const r = await migadu(`/domains/${NIEUW_DOMEIN}/mailboxes`, {
    method: "POST",
    body: JSON.stringify({
      local_part: local,
      name: naam,
      password: wachtwoord,
      may_send: true,
      may_receive: true,
      may_access_imap: true,
      may_access_pop3: true,
      may_access_managesieve: true,
      is_internal: false,
    }),
  });
  if (!r.ok) {
    return { ok: false, local, error: r.data?.error || `HTTP ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}` };
  }
  return { ok: true, local, wachtwoord, naam };
}

async function maakForwarder(vanLocal, naarFull) {
  // Eerst: alias-strategie via aparte aliases-resource
  const r = await migadu(`/domains/${OUD_DOMEIN}/aliases`, {
    method: "POST",
    body: JSON.stringify({
      local_part: vanLocal,
      destinations: [naarFull],
    }),
  });
  if (r.ok) return { ok: true, via: "alias" };

  // Fallback: als de oude mailbox al bestaat, update 'm met forwarding
  const bestaat = await migadu(`/domains/${OUD_DOMEIN}/mailboxes/${vanLocal}`);
  if (bestaat.ok) {
    const upd = await migadu(`/domains/${OUD_DOMEIN}/mailboxes/${vanLocal}`, {
      method: "PUT",
      body: JSON.stringify({
        delivery_to: [naarFull],
        forwardings: [naarFull],
      }),
    });
    if (upd.ok) return { ok: true, via: "mailbox-update" };
    return { ok: false, error: `mailbox-update HTTP ${upd.status}: ${JSON.stringify(upd.data).slice(0, 200)}` };
  }

  return { ok: false, error: `alias HTTP ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}` };
}

async function haalProfilesUitSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log("ℹ️  SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY niet gezet → alleen vaste mailbox-lijst.");
    return [];
  }
  const url = `${SUPABASE_URL}/rest/v1/profiles?select=voornaam,achternaam,mail_adres&mail_adres=ilike.%25@${OUD_DOMEIN}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) {
    console.error(`⚠️  Supabase-query mislukt (HTTP ${res.status}). Skip dynamic users.`);
    return [];
  }
  const data = await res.json();
  return data.map((p) => ({
    local: maakLocalPart(p.voornaam),
    naam: `${p.voornaam ?? ""} ${p.achternaam ?? ""}`.trim() || p.voornaam || "User",
    bron: "supabase",
  })).filter((p) => p.local);
}

// ─── MAIN ───────────────────────────────────────────────────────

console.log("\n🚀 Migadu Noah recruitment setup\n");
console.log(`Nieuw domein:  ${NIEUW_DOMEIN}`);
console.log(`Forward van:   ${OUD_DOMEIN}\n`);

// Vaste lijst — team + service-adressen
const VAST = [
  { local: "yorith",  naam: "Yorith Hulzebosch",     forward: true,  bron: "vast" },
  { local: "pepijn",  naam: "Pepijn Zwartenberg",    forward: true,  bron: "vast" },
  { local: "wouter",  naam: "Wouter Allard",         forward: true,  bron: "vast" },
  { local: "bart",    naam: "Bart Verstand",         forward: true,  bron: "vast" },
  { local: "info",    naam: "Noah recruitment Info", forward: true,  bron: "vast" },
  { local: "noreply", naam: "Noah recruitment",      forward: false, bron: "vast" },
];

// Dynamic uit Supabase
const dynamic = await haalProfilesUitSupabase();
console.log(`📊 ${dynamic.length} extra users uit profiles met @${OUD_DOMEIN}.\n`);

// Combineer + dedup (vast heeft voorrang qua label)
const merged = new Map();
for (const m of VAST) merged.set(m.local, { ...m, forward: m.forward });
for (const d of dynamic) {
  if (!merged.has(d.local)) merged.set(d.local, { ...d, forward: true });
}
const alle = [...merged.values()];

console.log("━━━ Mailboxen op noah-recruitment.nl ━━━\n");

const wachtwoorden = [];

for (const m of alle) {
  process.stdout.write(`  ${m.local}@${NIEUW_DOMEIN.padEnd(28)} (${m.bron}) ... `);
  const r = await maakMailbox(m.local, m.naam);
  if (r.alBestaat) {
    console.log("⏭️  bestaat al");
  } else if (r.ok) {
    console.log("✅ aangemaakt");
    wachtwoorden.push({ email: `${m.local}@${NIEUW_DOMEIN}`, naam: m.naam, wachtwoord: r.wachtwoord });
  } else {
    console.log(`❌ ${r.error}`);
  }
}

console.log("\n━━━ Forwarders op grywo.nl ━━━\n");

for (const m of alle) {
  if (!m.forward) continue;
  process.stdout.write(`  ${m.local}@${OUD_DOMEIN}  →  ${m.local}@${NIEUW_DOMEIN} ... `);
  const r = await maakForwarder(m.local, `${m.local}@${NIEUW_DOMEIN}`);
  if (r.ok) {
    console.log(`✅ (via ${r.via})`);
  } else {
    console.log(`❌ ${r.error}`);
  }
}

if (wachtwoorden.length > 0) {
  console.log("\n━━━ NIEUWE WACHTWOORDEN — BEWAAR IN PASSWORD MANAGER ━━━\n");
  for (const w of wachtwoorden) {
    console.log(`  ${w.email.padEnd(40)} ${w.wachtwoord}  (${w.naam})`);
  }
  console.log(`\n⚠️  ${wachtwoorden.length} wachtwoorden gegenereerd. Kopieer naar 1Password/Bitwarden — zijn alleen NU zichtbaar.\n`);
} else {
  console.log("\nGeen nieuwe wachtwoorden (alles bestond al).\n");
}

console.log("Klaar.\n");
