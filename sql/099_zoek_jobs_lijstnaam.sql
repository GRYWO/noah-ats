-- ===========================================
-- ZOEK_JOBS — aanpasbare lijstnaam voor Jobdigger-zoeklijsten
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.zoek_jobs
  add column if not exists lijst_naam text;
