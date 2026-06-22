-- ===========================================
-- Voorstelprofiel per Robin-kandidaat (uit de profieltekst, Noah-stijl)
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.bellijst_items
  add column if not exists voorstelprofiel       jsonb,
  add column if not exists voorstelprofiel_token text;

create unique index if not exists bellijst_items_voorstelprofiel_token_key
  on public.bellijst_items (voorstelprofiel_token)
  where voorstelprofiel_token is not null;
