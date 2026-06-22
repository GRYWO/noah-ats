-- ===========================================
-- Automatisch kandidaten zoeken (Robin, 40km) + AI-ranking
-- Run in Supabase SQL Editor
-- ===========================================

-- Zoekopdracht: straal + locatie meegeven aan de bot (voor 40km-zoeken).
alter table public.zoek_jobs
  add column if not exists straal_km integer not null default 40,
  add column if not exists plaats   text,
  add column if not exists lat      double precision,
  add column if not exists lon      double precision;

-- Kandidaat in de bellijst: AI-matchscore + reden + extra Robin-velden.
alter table public.bellijst_items
  add column if not exists match_score  integer,
  add column if not exists match_reden  text,
  add column if not exists profiel_tekst text,
  add column if not exists cv_url       text;
