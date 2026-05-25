-- Startdatum van de plaatsing (eerste werkdag bij de klant)
alter table public.plaatsingen
  add column if not exists startdatum date;
