-- ===========================================
-- Apart intake-notitieveld voor de kandidaatpagina
-- Run in Supabase SQL Editor
--
-- De setter schrijft hier zijn eigen intake-notitie. Voorheen werd hiervoor het
-- notitie-veld hergebruikt, dat bij geautomatiseerd gevonden kandidaten al de
-- ruwe (aan elkaar geplakte) profieltekst bevatte. Die ruwe tekst blijft in
-- notitie staan en wordt nu read-only onder "Profiel bekijken" getoond.
-- ===========================================

alter table public.kandidaten
  add column if not exists intake_notitie text;
