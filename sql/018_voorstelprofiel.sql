-- ===========================================
-- CV-controle + AI-profielschets + voorstelprofiel
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.kandidaten
  add column if not exists cv_geparseerd jsonb,
  add column if not exists profielschets text,
  add column if not exists voorstelprofiel_token text unique
    default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists voorstelprofiel_extra jsonb,
  add column if not exists cv_controle_status text default 'niet_gecontroleerd',
  add column if not exists cv_controle_op timestamptz,
  add column if not exists cv_controle_door uuid references public.profiles(id) on delete set null;

-- Statussen: niet_gecontroleerd / in_controle / goedgekeurd / afgekeurd

create index if not exists kandidaten_voorstelprofiel_token_idx
  on public.kandidaten (voorstelprofiel_token);

-- Backfill tokens voor bestaande rijen
update public.kandidaten
   set voorstelprofiel_token = replace(gen_random_uuid()::text, '-', '')
 where voorstelprofiel_token is null;
