-- ===========================================
-- ZOEKFILTERS voor kandidaten (intake setter-info)
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.kandidaten
  add column if not exists max_reisafstand_km int,
  add column if not exists blacklist_bedrijven text,
  add column if not exists intake_zoekfilters_voltooid boolean default false;

-- open_voor en woonplaats bestaan al
