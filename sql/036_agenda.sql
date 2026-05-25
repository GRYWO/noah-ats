-- ===========================================
-- Agenda: team-afspraken + auto-events uit voorstellen/plaatsingen
-- ===========================================

-- Team-events (door admin aangemaakt; voor alle setters/recruiters van de tenant)
create table if not exists public.agenda_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  titel           text not null,
  beschrijving    text,
  start_op        timestamptz not null,
  eind_op         timestamptz,
  locatie         text,
  meet_url        text,
  aangemaakt_door uuid references public.profiles(id) on delete set null,
  reminder_sent   timestamptz,
  created_at      timestamptz default now()
);

create index if not exists agenda_events_tenant_idx on public.agenda_events (tenant_id, start_op);

alter table public.agenda_events enable row level security;

create policy "Agenda eigen tenant lezen"
  on public.agenda_events for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Agenda alleen admin schrijven"
  on public.agenda_events for all
  using (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid() and rol = 'admin')
  )
  with check (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid() and rol = 'admin')
  );

-- 2e gesprek-datum per voorstel
alter table public.voorstellen
  add column if not exists tweede_gesprek_op timestamptz,
  add column if not exists reminder_1e_gesprek_sent timestamptz,
  add column if not exists reminder_2e_gesprek_sent timestamptz;

-- Reminder voor eerste werkdag (plaatsing)
alter table public.plaatsingen
  add column if not exists reminder_startdatum_sent timestamptz;
