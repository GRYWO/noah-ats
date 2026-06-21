-- ===========================================
-- JOBDIGGER_VONDSTEN — volledige vacaturetekst van de detailpagina
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.jobdigger_vondsten
  add column if not exists detail_tekst text;
