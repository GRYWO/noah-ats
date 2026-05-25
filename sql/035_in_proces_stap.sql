-- Nieuwe kanban-stap "in_proces" tussen bij_setter en voorgesteld_opdrachtgever
-- Wordt automatisch gezet zodra setter een bellijst heeft opgeslagen.

alter table public.kandidaten
  add column if not exists in_proces_mail_sent timestamptz;
