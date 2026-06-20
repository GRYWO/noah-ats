-- ===========================================
-- REC_VACATURES — interne contactgegevens (ALLEEN voor ons)
-- Run in Supabase SQL Editor
--
-- Deze velden komen NOOIT op de publieke website: de /vacatures-pagina van
-- noah-recruitment selecteert alleen anonieme kolommen. Hier bewaren we het
-- gevonden bedrijf + contactpersoon/telefoon/mailadres puur intern.
-- ===========================================

alter table public.rec_vacatures
  add column if not exists intern_contactpersoon text,
  add column if not exists intern_telefoon text,
  add column if not exists intern_mailadres text,
  add column if not exists intern_bedrijf text;
