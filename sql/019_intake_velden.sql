-- ===========================================
-- Extra intake-velden (OTYS-stijl) voor kandidaten
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.kandidaten
  add column if not exists soort_dienstverband text,
  add column if not exists werving_of_uitzend text,
  add column if not exists salaris_indicatie text,
  add column if not exists bijzonderheden text,
  add column if not exists omrekenfactor_uitzendbasis text,
  add column if not exists intake_voltooid boolean default false;

comment on column public.kandidaten.soort_dienstverband is 'Fulltime / Parttime / Flex / etc.';
comment on column public.kandidaten.werving_of_uitzend is 'Werving en selectie / Uitzendbasis / Beide';
