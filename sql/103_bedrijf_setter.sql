-- ===========================================
-- BEDRIJF_SETTER — plakkerig eigenaarschap: de eerste setter die een vacature
-- van een bedrijf plaatst, blijft eigenaar van dat bedrijf. Volgende vacatures
-- van datzelfde bedrijf komen automatisch op die setter z'n naam.
-- Run in Supabase SQL Editor
-- ===========================================

create table if not exists public.bedrijf_setter (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  bedrijf_norm text not null,
  setter_id   uuid not null,
  aangemaakt  timestamptz not null default now(),
  unique (tenant_id, bedrijf_norm)
);
