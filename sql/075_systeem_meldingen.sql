-- Systeem-meldingen: rode banner bovenaan elke pagina, beheerd door super-admin.
-- Voor updates, storingen en let-op-meldingen die iedereen moet zien.

create table if not exists systeem_meldingen (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('let_op', 'update', 'storing')),
  titel text not null,
  bericht text not null,
  actief boolean not null default true,
  aangemaakt_door uuid references auth.users(id) on delete set null,
  aangemaakt_op timestamptz not null default now(),
  gedeactiveerd_op timestamptz
);

create index if not exists idx_systeem_meldingen_actief
  on systeem_meldingen (actief, aangemaakt_op desc);

alter table systeem_meldingen enable row level security;

-- Iedereen mag actieve meldingen lezen (banner moet voor alle users tonen)
drop policy if exists "actieve meldingen leesbaar voor iedereen" on systeem_meldingen;
create policy "actieve meldingen leesbaar voor iedereen"
  on systeem_meldingen for select
  to authenticated
  using (true);

-- Alleen super-admin kan inserten/updaten/deleten (wordt server-side afgevangen)
drop policy if exists "service role mag alles" on systeem_meldingen;
create policy "service role mag alles"
  on systeem_meldingen for all
  to service_role
  using (true)
  with check (true);
