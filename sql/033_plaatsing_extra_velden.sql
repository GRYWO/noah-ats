-- Werving & Selectie: werkelijk fee-bedrag (niet alleen percentage)
alter table public.plaatsingen
  add column if not exists tarief_bedrag numeric;

-- Audit-trail bij afkeuren (i.p.v. rij verwijderen)
alter table public.plaatsingen
  add column if not exists afgekeurd_op    timestamptz,
  add column if not exists afgekeurd_door  uuid references public.profiles(id) on delete set null,
  add column if not exists afkeur_reden    text;

create index if not exists plaatsingen_actief_idx
  on public.plaatsingen (kandidaat_id)
  where afgekeurd_op is null;
