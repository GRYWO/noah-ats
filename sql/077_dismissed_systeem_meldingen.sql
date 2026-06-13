-- Migration 077: per-user dismiss van systeem-meldingen
-- Vervangt de localStorage-only dismiss zodat een melding die je hebt
-- weggeklikt voorgoed verborgen blijft, ook op andere apparaten / browsers.

create table if not exists dismissed_systeem_meldingen (
  user_id uuid not null references auth.users(id) on delete cascade,
  melding_id uuid not null references systeem_meldingen(id) on delete cascade,
  dismissed_op timestamptz not null default now(),
  primary key (user_id, melding_id)
);

create index if not exists idx_dismissed_systeem_meldingen_user
  on dismissed_systeem_meldingen (user_id);

alter table dismissed_systeem_meldingen enable row level security;

-- User mag eigen dismiss-rijen zien
drop policy if exists "user ziet eigen dismisses" on dismissed_systeem_meldingen;
create policy "user ziet eigen dismisses"
  on dismissed_systeem_meldingen for select
  to authenticated
  using (user_id = auth.uid());

-- User mag eigen dismiss inserten
drop policy if exists "user mag eigen dismiss inserten" on dismissed_systeem_meldingen;
create policy "user mag eigen dismiss inserten"
  on dismissed_systeem_meldingen for insert
  to authenticated
  with check (user_id = auth.uid());

-- Service role mag alles (server-actions)
drop policy if exists "service role mag alles op dismisses" on dismissed_systeem_meldingen;
create policy "service role mag alles op dismisses"
  on dismissed_systeem_meldingen for all
  to service_role
  using (true)
  with check (true);
