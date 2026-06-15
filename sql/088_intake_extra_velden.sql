-- ============================================================
--  088 — Extra intake-velden op kandidaten
--  Talen (kommagescheiden string) en beschikbaarheid (vrije tekst).
--  Deze velden komen 1-op-1 uit IntakeProfiel; zonder eigen kolommen
--  worden ze in cv_geparseerd gepropt en zijn ze niet doorzoekbaar.
--  Eén keer draaien in de Supabase SQL-editor.
-- ============================================================

alter table public.kandidaten
  add column if not exists talen text,
  add column if not exists beschikbaarheid text;
