-- ===========================================
-- Telefoon onthullen per kandidaat (Robin): job-velden om de juiste kandidaat
-- terug te vinden en bij te werken.
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.zoek_jobs
  add column if not exists doel_item_id uuid,
  add column if not exists doel_naam    text;
