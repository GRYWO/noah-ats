-- ===========================================
-- Vrij in te vullen functietitel voor signature
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.profiles
  add column if not exists functie_titel text;
