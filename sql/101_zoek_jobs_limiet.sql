-- ===========================================
-- ZOEK_JOBS — gewenst aantal resultaten (lijstgrootte), standaard 50.
-- Met "Zoek 50 meer" wordt dit opgehoogd en de zoekopdracht opnieuw gedraaid.
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.zoek_jobs
  add column if not exists limiet integer not null default 50;
