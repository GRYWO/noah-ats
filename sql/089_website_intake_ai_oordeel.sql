-- ============================================================
--  089 — Website-intake AI-oordeel op kandidaten
--  Wouter krijgt op de kandidaat-detailpagina een aparte beslissingsbalk
--  voor kandidaten in de kanban-kolom 'website'. Daar willen we het
--  AI-oordeel van noah-recruitment (goedgekeurd / afgekeurd + redenen)
--  prominent kunnen tonen zonder uit het notitie-veld te moeten parsen.
--  Eén keer draaien in de Supabase SQL-editor.
-- ============================================================

alter table public.kandidaten
  add column if not exists website_intake_ai_oordeel text,
  add column if not exists website_intake_ai_redenen text;

comment on column public.kandidaten.website_intake_ai_oordeel is
  'Oordeel van de website-intake-AI: ''goedgekeurd'' of ''afgekeurd''. Alleen ingevuld voor kandidaten die via de noah-recruitment website binnenkomen.';
comment on column public.kandidaten.website_intake_ai_redenen is
  'Redenen waarom de AI afkeurde, kommagescheiden. Leeg bij goedgekeurd.';
