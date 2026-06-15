-- 086_vacature_afspraken.sql
-- Voegt interne commerciele-afspraak-velden toe aan rec_vacatures.
-- Deze velden zijn ALLEEN intern (ATS / admin). Ze worden bewust NIET
-- geselecteerd door de publieke noah-recruitment website (zie expliciete
-- select-kolomlijsten in noah-recruitment/src/app/vacatures/*).
--
-- afspraak_tarief_type bevat een van:
--   'ws_10'     = Werving & selectie 10 procent (speciaal tarief uitzendbureaus)
--   'ws_15'     = Werving & selectie 15 procent (normaal tarief)
--   'ws_anders' = Werving & selectie afwijkend percentage (vrije waarde)
--   'uitzend'   = Uitzendbasis (factor + uren + overname-uren)
--
-- Geen NOT NULL: bestaande vacatures hebben geen afspraak.

ALTER TABLE public.rec_vacatures
  ADD COLUMN IF NOT EXISTS afspraak_tarief_type text,
  ADD COLUMN IF NOT EXISTS afspraak_ws_percentage numeric,
  ADD COLUMN IF NOT EXISTS afspraak_ws_toelichting text,
  ADD COLUMN IF NOT EXISTS afspraak_uitzend_factor numeric,
  ADD COLUMN IF NOT EXISTS afspraak_uitzend_uren_per_week text,
  ADD COLUMN IF NOT EXISTS afspraak_overname_na_uren integer;

-- Sanity-check de toegestane waarden (laat NULL toe).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rec_vacatures_afspraak_tarief_type_check'
  ) THEN
    ALTER TABLE public.rec_vacatures
      ADD CONSTRAINT rec_vacatures_afspraak_tarief_type_check
      CHECK (
        afspraak_tarief_type IS NULL
        OR afspraak_tarief_type IN ('ws_10', 'ws_15', 'ws_anders', 'uitzend')
      );
  END IF;
END$$;
