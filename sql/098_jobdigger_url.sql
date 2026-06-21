-- ===========================================
-- JOBDIGGER_VONDSTEN — link naar de échte vacature op Jobdigger
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.jobdigger_vondsten
  add column if not exists jobdigger_url text;
