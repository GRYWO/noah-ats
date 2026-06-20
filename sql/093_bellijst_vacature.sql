-- ===========================================
-- BELLIJST bij een VACATURE (Robin-kandidaten)
-- Run in Supabase SQL Editor
--
-- Een bellijst kon alleen bij een kandidaat horen (Jobdigger-bedrijven).
-- Robin levert kandidaten (personen) voor een vacature; die slaan we op als
-- een bellijst die aan de vacature gekoppeld is.
-- ===========================================

-- Koppeling van de bellijst aan een vacature (naast de bestaande kandidaat_id).
alter table public.bellijsten
  add column if not exists vacature_id uuid references public.rec_vacatures(id) on delete cascade;

create index if not exists bellijsten_vacature_idx on public.bellijsten (vacature_id);

-- Robin levert personen: naam op item-niveau (bedrijf/branche blijven leeg).
alter table public.bellijst_items
  add column if not exists naam text;
