// ============================================================================
// Staging testdata: 100 nep-setters + test-vacatures + test-kandidaten.
//
// ⚠️ ALLEEN voor een APARTE STAGING-Supabase. Het script WEIGERT te draaien op
//    de productie-database en stuurt zelf NOOIT e-mail of zoekbot-jobs (puur
//    database in/uit). Veilig om te seeden en daarna helemaal op te ruimen.
//
// Gebruik:
//   STAGING_SUPABASE_URL=...            (de staging project-URL)
//   STAGING_SUPABASE_SERVICE_ROLE_KEY=... (staging service-role key)
//   STAGING_TENANT_ID=...               (tenant waarin geseed wordt)
//   STAGING_CONFIRM=ja                  (bevestiging, anders weigert het)
//
//   node scripts/staging-testdata.mjs seed       # 100 setters + data aanmaken
//   node scripts/staging-testdata.mjs teardown   # alles weer verwijderen
// ============================================================================

import { createClient } from "@supabase/supabase-js";

const PRODUCTIE_REF = "gxtmybaydakhcwnzpjgd"; // productie project-ref — NOOIT seeden
const TEST_DOMEIN = "noahtest.local";          // niet-routeerbaar: er gaat nooit echt mail heen
const TEST_WACHTWOORD = "Test1234!staging";
const MARKER = "[TEST]";

const URL = process.env.STAGING_SUPABASE_URL;
const KEY = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const TENANT_ID = process.env.STAGING_TENANT_ID;
const cmd = process.argv[2];

function stop(msg) {
  console.error("✋ " + msg);
  process.exit(1);
}

// ---- Veiligheidssloten ----
if (!URL || !KEY) stop("Zet STAGING_SUPABASE_URL en STAGING_SUPABASE_SERVICE_ROLE_KEY.");
if (URL.includes(PRODUCTIE_REF)) stop("Dit lijkt de PRODUCTIE-database. Geweigerd. Gebruik een aparte staging-Supabase.");
if (process.env.STAGING_CONFIRM !== "ja") stop('Zet STAGING_CONFIRM=ja om te bevestigen dat dit de staging-omgeving is.');
if (!TENANT_ID) stop("Zet STAGING_TENANT_ID (de tenant waarin geseed wordt).");
if (!["seed", "teardown"].includes(cmd)) stop("Gebruik: node scripts/staging-testdata.mjs seed | teardown");

const admin = createClient(URL, KEY, { auth: { persistSession: false } });

const STAPPEN = ["interne_intake", "kandidatenpool", "in_proces", "geplaatst", "afgewezen"];
const VOORSTEL = { in_proces: ["voorgesteld", "gezien", "op_gesprek"] };
const PLAATSEN = ["Amsterdam", "Rotterdam", "Utrecht", "Zwolle", "Eindhoven", "Groningen", "Tilburg", "Breda"];
const FUNCTIES = ["Administratief medewerker", "Allround monteur", "Heftruckchauffeur", "Financieel medewerker", "Productiemedewerker"];
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

async function seed() {
  console.log("Seeden van 100 testsetters + data in tenant", TENANT_ID, "…");
  const setterIds = [];

  // 1) 100 setters (auth-user + profiel)
  for (let i = 1; i <= 100; i++) {
    const nr = String(i).padStart(3, "0");
    const email = `setter-${nr}@${TEST_DOMEIN}`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEST_WACHTWOORD,
      email_confirm: true,
      user_metadata: { test: true },
    });
    if (error) {
      if (!String(error.message).toLowerCase().includes("already")) console.warn("  user", email, "->", error.message);
      continue;
    }
    const id = data.user.id;
    setterIds.push(id);
    await admin.from("profiles").upsert({ id, tenant_id: TENANT_ID, voornaam: `TestSetter${nr}`, achternaam: MARKER, rol: "setter", mail_adres: email });
    if (i % 20 === 0) console.log("  …", i, "setters");
  }
  console.log("✔", setterIds.length, "setters aangemaakt.");

  // 2) Vacatures: per ~30 setters één, + 10 onbeheerd (Noah launch-stijl)
  const vacIds = [];
  for (let i = 0; i < 40; i++) {
    const setter = i < 30 ? setterIds[i] : null; // 10 zonder setter = "te claimen"
    const titel = `${MARKER} ${rnd(FUNCTIES)}`;
    const { data } = await admin.from("rec_vacatures").insert({
      eigenaar: setter, setter_id: setter, titel, locatie: rnd(PLAATSEN),
      status: "open", bedrijfsnaam: `${MARKER} Testbedrijf ${i + 1}`,
      contact_naam: "Test Contact", contact_email: `vac-${i}@${TEST_DOMEIN}`,
      afspraak_tarief_type: rnd(["ws_15", "ws_10", "uitzend"]),
    }).select("id").single();
    if (data) vacIds.push({ id: data.id, setter });
  }
  console.log("✔", vacIds.length, "test-vacatures (incl. 10 te claimen).");

  // 3) Kandidaten: verdeeld over setters + fases
  let n = 0;
  for (let i = 0; i < 200; i++) {
    const setter = rnd(setterIds);
    const stap = rnd(STAPPEN);
    const vs = VOORSTEL[stap] ? rnd(VOORSTEL[stap]) : null;
    const { error } = await admin.from("kandidaten").insert({
      tenant_id: TENANT_ID, eigenaar_id: setter, voornaam: `${MARKER} Kandidaat${i + 1}`, achternaam: MARKER,
      woonplaats: rnd(PLAATSEN), telefoon: "0600000000", email: `kandidaat-${i}@${TEST_DOMEIN}`,
      kanban_stap: stap, voorstel_status: vs, status: stap === "afgewezen" ? "afgewezen" : "in_proces",
      intake_voltooid: true,
    });
    if (!error) n++;
  }
  console.log("✔", n, "test-kandidaten.");
  console.log("\nKlaar. Inloggen kan met elk setter-mailadres en wachtwoord:", TEST_WACHTWOORD);
  console.log("Opruimen: node scripts/staging-testdata.mjs teardown");
}

async function teardown() {
  console.log("Verwijderen van alle testdata (marker", MARKER, "/ domein", TEST_DOMEIN, ")…");

  // Test-setters ophalen (auth-users met test-domein)
  const testUserIds = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) if ((u.email ?? "").endsWith(`@${TEST_DOMEIN}`)) testUserIds.push(u.id);
    if (data.users.length < 200) break;
    page++;
  }

  // Kandidaten + vacatures van test-setters + marker
  if (testUserIds.length) {
    await admin.from("kandidaten").delete().in("eigenaar_id", testUserIds);
    await admin.from("rec_vacatures").delete().in("setter_id", testUserIds);
  }
  await admin.from("kandidaten").delete().ilike("achternaam", MARKER);
  await admin.from("rec_vacatures").delete().ilike("titel", `${MARKER}%`);

  // Profielen + auth-users
  for (const id of testUserIds) {
    await admin.from("profiles").delete().eq("id", id);
    await admin.auth.admin.deleteUser(id);
  }
  console.log("✔ Verwijderd:", testUserIds.length, "setters + bijbehorende test-vacatures/-kandidaten.");
}

(cmd === "seed" ? seed() : teardown()).catch((e) => stop(e.message));
