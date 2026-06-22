-- ===========================================
-- Noah launch-koppeling: claim-mechanisme voor vacatures
-- Run in Supabase SQL Editor
--
-- rec_vacatures.eigenaar = het account dat de vacature bezit. Bij vacatures uit
-- Noah launch is dat het BEDRIJF (werkgever-user), niet een setter. We voegen
-- daarom setter_id toe: de setter die de vacature in de ATS oppakt ("claimt").
--
--  - ATS-gemaakte vacatures: setter_id = de setter (zie backfill hieronder).
--  - Noah launch-vacatures: setter_id = NULL  -> verschijnen als "te claimen".
--    Zodra een setter claimt, wordt setter_id gezet en start het zoeken.
-- ===========================================

alter table public.rec_vacatures
  add column if not exists setter_id uuid references public.profiles(id) on delete set null;

create index if not exists rec_vacatures_setter_idx on public.rec_vacatures (setter_id);

-- Backfill: bestaande ATS-vacatures (eigenaar is een setter/profiel) krijgen
-- setter_id = eigenaar, zodat ze op het Dashboard van die setter blijven staan.
-- Noah launch-vacatures (eigenaar = bedrijf, niet in profiles) blijven NULL.
update public.rec_vacatures v
  set setter_id = v.eigenaar
  where v.setter_id is null
    and v.eigenaar is not null
    and exists (select 1 from public.profiles p where p.id = v.eigenaar);
