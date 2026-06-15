-- ============================================================
--  087 — Extra screeningsvelden uit de (website-/handmatige) intake
--  Uren per week, werkvergunning in NL, voldoende Nederlands.
--  Eén keer draaien in de Supabase SQL-editor.
-- ============================================================

alter table public.kandidaten
  add column if not exists uren_per_week int,
  add column if not exists werkvergunning boolean,
  add column if not exists nederlands_voldoende boolean;
