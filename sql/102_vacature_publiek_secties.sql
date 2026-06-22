-- ===========================================
-- REC_VACATURES — gestructureerde publieke secties (voor nette website-indeling)
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.rec_vacatures
  add column if not exists publiek_secties jsonb;
