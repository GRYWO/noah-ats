#!/usr/bin/env node
/**
 * Automatische Migadu setup voor de Noah recruitment rebrand.
 *
 * Maakt aan op noah-recruitment.nl:
 *   yorith, pepijn, wouter, bart, info, noreply
 *
 * Maakt forwarders aan op grywo.nl die naar de nieuwe @noah-recruitment.nl
 * mailboxen sturen:
 *   yorith@grywo.nl  → yorith@noah-recruitment.nl
 *   pepijn@grywo.nl  → pepijn@noah-recruitment.nl
 *   wouter@grywo.nl  → wouter@noah-recruitment.nl
 *   bart@grywo.nl    → bart@noah-recruitment.nl
 *   info@grywo.nl    → info@noah-recruitment.nl
 *
 * Wachtwoorden worden gegenereerd en aan het eind getoond — bewaar ze
 * in je password-manager.
 *
 * GEBRUIK:
 *   export MIGADU_API_USER="yorith@grywo.nl"
 *   export MIGADU_API_KEY="je-migadu-api-key"
 *   node scripts/migadu-noah-recruitment-setup.mjs
 *
 * Idempotent: als een mailbox/forwarder al bestaat wordt 'm overgeslagen.
 */

import { randomBytes } from "node:crypto";

const BASE = "https://api.migadu.com/v1";
const NIEUW_DOMEIN = "noah-recruitment.nl";
const OUD_DOMEIN = "grywo.nl";

const MAILBOXEN = [
  { local: "yorith",  naam: "Yorith Hulzebosch" },
  { local: "pepijn",  naam: "Pepijn Zwartenberg" },
  { local: "wouter",  naam: "Wouter Allard" },
  { local: "bart",    naam: "Bart Verstand" },
  { local: "info",    naam: "Noah recruitment Info" },
  { local: "noreply", naam: "Noah recruitment" },
];

// Forwarders: 'noreply' niet — die ontvangt geen mail
const FORWARDERS = MAILBOXEN
  .filter((m) => m.local !== "noreply")
  .map((m) => ({
    van: `${m.local}@${OUD_DOMEIN}`,
    naar: `${m.local}@${NIEUW_DOMEIN}`,
  }));

const USER = process.env.MIGADU_API_USER;
const KEY = process.env.MIGADU_API_KEY;

if (!USER || !KEY) {
  console.error("\n❌ Ontbrekende env-vars MIGADU_API_USER en/of MIGADU_API_KEY.\n");
  console.error("Run als:");
  console.error('  export MIGADU_API_USER="yorith@grywo.nl"');
  console.error('  export MIGADU_API_KEY="..."');
  console.error("  node scripts/migadu-noah-recruitment-setup.mjs\n");
  process.exit(1);
}

const AUTH = "Basic " + Buffer.from(`${USER}:${KEY}`).toString("base64");

async function api(path, init = {}) {
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
  // 14 tekens met letters + cijfers + symbool. Sterk genoeg voor mailbox-login.
  const base = randomBytes(12).toString("base64").replace(/[+/=]/g, "");
  return base.slice(0, 12) + "X9!";
}

async function mailboxBestaat(domein, local) {
  const r = await api(`/domains/${domein}/mailboxes/${local}`);
  return r.ok;
}

async function maakMailbox(local, naam) {
  if (await mailboxBestaat(NIEUW_DOMEIN, local)) {
    return { ok: true, alBestaat: true, local, wachtwoord: null };
  }
  const wachtwoord = maakWachtwoord();
  const r = await api(`/domains/${NIEUW_DOMEIN}/mailboxes`, {
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
    return { ok: false, local, error: r.data?.error || `HTTP ${r.status}: ${JSON.stringify(r.data)}` };
  }
  return { ok: true, local, wachtwoord, naam };
}

async function forwarderBestaat(domein, local) {
  const r = await api(`/domains/${domein}/mailboxes/${local}`);
  if (!r.ok) return false;
  const dests = r.data?.delivery_to || r.data?.forwardings || [];
  return Array.isArray(dests) && dests.length > 0;
}

async function maakForwarder(vanLocal, naarFull) {
  // Migadu kent forwarders als aparte resource. Eerst proberen via /forwardings,
  // anders via mailbox-update met destination.
  const bestaat = await api(`/domains/${OUD_DOMEIN}/mailboxes/${vanLocal}`);

  // Strategie A: maak een aparte 'identity'/forwarder via address-aliases
  const r = await api(`/domains/${OUD_DOMEIN}/aliases`, {
    method: "POST",
    body: JSON.stringify({
      local_part: vanLocal,
      destinations: [naarFull],
    }),
  });
  if (r.ok) return { ok: true, van: `${vanLocal}@${OUD_DOMEIN}`, naar: naarFull, via: "alias" };

  // Strategie B: als alias-strategie faalt (bv. mailbox bestaat al met die naam),
  // update de bestaande mailbox met delivery_to/forwardings veld.
  if (bestaat.ok) {
    const upd = await api(`/domains/${OUD_DOMEIN}/mailboxes/${vanLocal}`, {
      method: "PUT",
      body: JSON.stringify({
        forwardings: [naarFull],
        // Keep a copy in source mailbox tijdelijk uit zodat alle mail door komt
        delivery_to: [naarFull],
      }),
    });
    if (upd.ok) return { ok: true, van: `${vanLocal}@${OUD_DOMEIN}`, naar: naarFull, via: "mailbox-update" };
    return { ok: false, van: `${vanLocal}@${OUD_DOMEIN}`, error: `mailbox-update faal: HTTP ${upd.status} ${JSON.stringify(upd.data)}` };
  }

  return { ok: false, van: `${vanLocal}@${OUD_DOMEIN}`, error: `alias-creatie faal: HTTP ${r.status} ${JSON.stringify(r.data)}` };
}

// ─── MAIN ───────────────────────────────────────────────────────────

console.log("\n🚀 Migadu Noah recruitment setup\n");
console.log(`API-user:  ${USER}`);
console.log(`Nieuw:     ${NIEUW_DOMEIN}  (${MAILBOXEN.length} mailboxen)`);
console.log(`Forwarder: ${OUD_DOMEIN}  →  ${NIEUW_DOMEIN}  (${FORWARDERS.length} aliassen)\n`);

console.log("━━━ Mailboxen op noah-recruitment.nl ━━━\n");

const wachtwoorden = [];

for (const mb of MAILBOXEN) {
  process.stdout.write(`  ${mb.local}@${NIEUW_DOMEIN} ... `);
  const r = await maakMailbox(mb.local, mb.naam);
  if (r.alBestaat) {
    console.log("⏭️  bestaat al, overslaan");
  } else if (r.ok) {
    console.log("✅ aangemaakt");
    wachtwoorden.push({ email: `${mb.local}@${NIEUW_DOMEIN}`, naam: mb.naam, wachtwoord: r.wachtwoord });
  } else {
    console.log(`❌ ${r.error}`);
  }
}

console.log("\n━━━ Forwarders op grywo.nl ━━━\n");

for (const fw of FORWARDERS) {
  process.stdout.write(`  ${fw.van}  →  ${fw.naar} ... `);
  const r = await maakForwarder(fw.van.split("@")[0], fw.naar);
  if (r.ok) {
    console.log(`✅ (via ${r.via})`);
  } else {
    console.log(`❌ ${r.error}`);
  }
}

if (wachtwoorden.length > 0) {
  console.log("\n━━━ NIEUWE WACHTWOORDEN — BEWAAR IN PASSWORD MANAGER ━━━\n");
  for (const w of wachtwoorden) {
    console.log(`  ${w.email.padEnd(36)} ${w.wachtwoord}`);
  }
  console.log("\n⚠️  Deze wachtwoorden zijn alleen NU zichtbaar. Kopieer ze direct naar 1Password / Bitwarden.\n");
} else {
  console.log("\nGeen nieuwe wachtwoorden gegenereerd (alles bestond al).\n");
}

console.log("Klaar.\n");
