-- ============================================================
-- NOAH ATS — 116: klant-eigenaarschap (setter "claimt" de hele klant)
-- ============================================================
-- Eén klant hoort bij één setter. De klant-sleutel is:
--   'acct:<eigenaar>'  → vacatures uit Noah Launch (eigenaar = bedrijfsaccount)
--   'naam:<bedrijf>'   → handmatig in de ATS aangemaakte vacatures (bedrijfsnaam)
-- Zodra een setter een vacature van een klant claimt, komt de hele klant op
-- zijn naam (alle open vacatures + toekomstige). Wordt de setter verwijderd,
-- dan vervalt het eigenaarschap (rij weg via cascade) en geven we de vacatures
-- vrij (gebeurt in de verwijder-actie).

create table if not exists public.rec_klant_eigenaar (
  klant_key   text primary key,
  setter_id   uuid not null references public.profiles(id) on delete cascade,
  tenant_id   uuid,
  aangemaakt  timestamptz not null default now()
);

create index if not exists idx_rec_klant_eigenaar_setter on public.rec_klant_eigenaar(setter_id);
