# Staging-load-test (100 nep-setters)

Veilig testen op een **aparte** Supabase, los van productie.

## 1. Maak een staging-Supabase
- Nieuw Supabase-project aanmaken (gratis tier kan).
- Draai daar **alle** SQL-migraties uit `sql/` (001 … 114) + `113` (RLS).
- Maak één tenant aan en noteer het `tenant_id` (of kopieer je tenant-structuur).

## 2. Veilig houden (geen echte mails / geen Robin-belasting)
Zet op de staging-deploy/omgeving:
- **Geen** echte `RESEND_API_KEY` (of een test-key) → geen echte e-mails.
- **Geen** bot die op staging pollt en **geen** echt `BOT_SECRET` dat naar het echte Robin-account wijst → geen Robin/Jobdigger-belasting.
- `ANTHROPIC_API_KEY` mag wel (alleen tekst genereren, kost een paar cent).

Het seed-script zelf stuurt **nooit** mail of bot-jobs — het schrijft alleen data.

## 3. Seed 100 setters + testdata
```bash
export STAGING_SUPABASE_URL="https://<staging-ref>.supabase.co"
export STAGING_SUPABASE_SERVICE_ROLE_KEY="<staging service-role key>"
export STAGING_TENANT_ID="<tenant id op staging>"
export STAGING_CONFIRM=ja
node scripts/staging-testdata.mjs seed
```
- 100 setters: `setter-001@noahtest.local` … `setter-100@noahtest.local`, wachtwoord `Test1234!staging`.
- ~40 test-vacatures (incl. 10 "te claimen") en ~200 test-kandidaten over de fases.
- Het script **weigert** te draaien als de URL de productie-database is.

## 4. Testen
- Log in als een paar testsetters → check dat ieder alleen z'n **eigen** data ziet (en Yorith/Pepijn/Wouter alles op de kanban).
- Claim een "te claimen" vacature, sleep kandidaten in de kanban, doe een (nep)plaatsing.
- Let op snelheid van Dashboard/Kanban met deze volumes.

## 5. Alles opruimen
```bash
node scripts/staging-testdata.mjs teardown
```
Verwijdert alle testsetters + bijbehorende test-vacatures/-kandidaten.
