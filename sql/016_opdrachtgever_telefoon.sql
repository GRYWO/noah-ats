-- ===========================================
-- Telefoon op opdrachtgevers (algemeen bedrijfsnummer)
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.opdrachtgevers
  add column if not exists telefoon text;
