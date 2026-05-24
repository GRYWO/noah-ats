-- ===========================================
-- Onboarding-tour flag op profielen
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.profiles
  add column if not exists onboarding_voltooid boolean default false;

-- Bestaande users hoeven geen tour meer
update public.profiles set onboarding_voltooid = true where onboarding_voltooid is null or onboarding_voltooid = false;
