-- Kandidaat kiest zelf 1 van 3 voorgestelde datums via klikbare mail
alter table public.voorstellen
  add column if not exists kandidaat_datum_gekozen_op timestamptz;

comment on column public.voorstellen.kandidaat_datum_gekozen_op is
  'Tijdstip waarop de kandidaat in de mail op een datum-knop klikte. '
  'Geeft aan dat kennismaking_op door kandidaat zelf is gekozen.';
