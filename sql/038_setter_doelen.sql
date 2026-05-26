-- Setter-doelen — elke setter zet zijn eigen doelen
alter table public.profiles
  add column if not exists doel_calls_dag           int default 50,
  add column if not exists doel_voorgesteld_week    int default 5,
  add column if not exists doel_afspraken_week      int default 3,
  add column if not exists doel_plaatsingen_maand   int default 2,
  add column if not exists doel_omzet_maand         numeric default 0;
