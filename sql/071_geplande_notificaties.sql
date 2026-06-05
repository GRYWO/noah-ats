-- 071: Geplande notificaties (herinneringen op datum + tijd)
-- Users kunnen voor zichzelf of een collega een notificatie inplannen.
-- Cron pikt ze op zodra geplande_tijd verlopen is en maakt een echte
-- notificatie aan in public.notificaties → popup verschijnt automatisch
-- via de bestaande realtime-subscription in NotificatieBel.

create table if not exists public.geplande_notificaties (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  voor_user_id    uuid not null references public.profiles(id) on delete cascade,
  gepland_door    uuid not null references public.profiles(id) on delete set null,
  titel           text not null,
  bericht         text,
  geplande_tijd   timestamptz not null,
  status          text not null default 'open',
    -- 'open' / 'verstuurd' / 'geannuleerd'
  verstuurd_op    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_geplande_notif_open_tijd
  on public.geplande_notificaties (geplande_tijd)
  where status = 'open';

create index if not exists idx_geplande_notif_user
  on public.geplande_notificaties (voor_user_id, status);

alter table public.geplande_notificaties enable row level security;

create policy "Geplande notificaties: eigen geplande zien"
  on public.geplande_notificaties for select
  using (gepland_door = auth.uid() or voor_user_id = auth.uid());

create policy "Geplande notificaties: zelf plannen"
  on public.geplande_notificaties for insert
  with check (gepland_door = auth.uid());

create policy "Geplande notificaties: zelf annuleren"
  on public.geplande_notificaties for update
  using (gepland_door = auth.uid());

comment on table public.geplande_notificaties is
  'Herinneringen op datum + tijd. Cron maakt op het juiste moment een notificatie aan.';
