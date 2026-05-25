-- ===========================================
-- Kanban-stappen herstructureren naar nieuwe flow
-- Nieuwe stappen (in volgorde):
--   interne_intake, in_afwachting_cv, in_wachtrij, bij_setter,
--   voorgesteld_opdrachtgever, 1e_gesprek, 2e_gesprek, geplaatst, afgewezen
-- ===========================================

-- Migreer bestaande waarden
update public.kandidaten set kanban_stap = 'interne_intake'
  where kanban_stap in ('nieuwe_sollicitatie', 'shortlist', 'interne_intake_ingepland');

update public.kandidaten set kanban_stap = 'in_wachtrij'
  where kanban_stap = 'interne_intake_voltooid';

update public.kandidaten set kanban_stap = '1e_gesprek'
  where kanban_stap in ('opdrachtgever_geinteresseerd', 'kennismaking_ingepland');

update public.kandidaten set kanban_stap = 'afgewezen'
  where kanban_stap = 'niet_geplaatst';

-- Voorkom dubbele auto-mails per kandidaat
alter table public.kandidaten
  add column if not exists intake_afgerond_mail_sent timestamptz,
  add column if not exists voorgesteld_mail_sent     timestamptz,
  add column if not exists gesprek1_mail_sent        timestamptz,
  add column if not exists gesprek2_mail_sent        timestamptz;
