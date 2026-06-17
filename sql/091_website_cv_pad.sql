-- 091_website_cv_pad.sql
--
-- Sla het storage-pad van het CV uit een website-intake op naast de
-- kandidaat. noah-recruitment uploadt het CV naar bucket 'rec-cvs'
-- onder een sleutel als 'intake/<uuid>.pdf'. Eerder werd alleen een
-- 30-dagen-signed-URL als platte tekst in 'notitie' gezet, waardoor
-- het CV onbereikbaar werd zodra die link verliep.
--
-- Door het pad zelf te bewaren kan de ATS on-demand een verse signed
-- URL bouwen via de admin-storage-client (RLS-bypass) en die naar de
-- gebruiker redirecten. Bucket 'rec-cvs' wordt gedeeld tussen de
-- noah-recruitment-site en de Noah ATS (zelfde Supabase-project).

alter table public.kandidaten
  add column if not exists website_cv_pad text;

comment on column public.kandidaten.website_cv_pad is
  'Storage-pad in rec-cvs bucket van noah-recruitment (intake/...). On-demand verse signed URL voor Wouter.';
