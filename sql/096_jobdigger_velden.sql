-- ===========================================
-- JOBDIGGER_VONDSTEN — extra velden: telefoon + datum
-- Run in Supabase SQL Editor
-- (titel/bedrijf/plaats/url bestonden al)
-- ===========================================

alter table public.jobdigger_vondsten
  add column if not exists telefoon text,
  add column if not exists datum text;
