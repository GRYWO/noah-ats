-- ===========================================
-- Onboarding tour-versie ipv boolean
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.profiles
  add column if not exists onboarding_versie int default 0;

-- Bestaande users die al onboarding_voltooid=true hadden: zet op huidige versie 1
update public.profiles set onboarding_versie = 1 where onboarding_voltooid = true;
