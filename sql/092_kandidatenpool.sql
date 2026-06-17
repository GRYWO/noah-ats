-- 092_kandidatenpool.sql
--
-- Voegt de kanban-stap 'kandidatenpool' toe als talentpool.
-- Wouter kan vanuit website-intakes kandidaten direct in de pool plaatsen,
-- zodat ze beschikbaar blijven voor latere matches zonder dat ze de
-- normale wachtrij-flow ingaan.
--
-- De kolom kandidaten.kanban_stap is een vrije text-kolom (zie 001_schema.sql),
-- er staat geen CHECK-constraint op. Voor de zekerheid: als die er ooit
-- bijkomt, voegen we hier 'kandidatenpool' toe aan de toegestane waarden.
-- Voor nu is dit dus puur defensief.

-- Index voor snelle pool-lijst-queries (waar=tenant + kanban_stap='kandidatenpool')
create index if not exists idx_kandidaten_pool
  on public.kandidaten(tenant_id, kanban_stap)
  where kanban_stap = 'kandidatenpool';

-- Documentatie op de kolom: leg uit dat 'kandidatenpool' nu ook een geldige waarde is.
comment on column public.kandidaten.kanban_stap is
  'Kanban-fase van de kandidaat in de pipeline. Mogelijke waarden incl. website, interne_intake, in_afwachting_cv, in_wachtrij, bij_setter, in_proces, voorgesteld_opdrachtgever, 1e_gesprek, 2e_gesprek, geplaatst, afgewezen, kandidatenpool. De pool is een talentpool voor latere matches.';
