-- ===========================================
-- VOORSTEL LOGS + extra velden
-- Run in Supabase SQL Editor
-- ===========================================

-- Extra kolommen voor voorstellen
alter table public.voorstellen
  add column if not exists geopend_op                   timestamptz,
  add column if not exists kennismaking_op              timestamptz,
  add column if not exists kennismaking_reminder_sent   timestamptz,
  add column if not exists kandidaat_voorgesteld_sent   timestamptz,
  add column if not exists kandidaat_uitnodigen_sent    timestamptz,
  add column if not exists kandidaat_afwijzing_sent     timestamptz;

-- Werkdagen-tellers
alter table public.voorstellen
  add column if not exists reminder_dag_1_sent timestamptz,
  add column if not exists reminder_dag_2_sent timestamptz,
  add column if not exists reminder_dag_3a_sent timestamptz,
  add column if not exists reminder_dag_3b_sent timestamptz;

-- Plaatsing/afwijzing trackers op kandidaten
alter table public.kandidaten
  add column if not exists plaatsing_mail_sent timestamptz,
  add column if not exists afwijzing_mail_sent timestamptz;

-- Log-tabel
create table if not exists public.voorstel_logs (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  voorstel_id     uuid references public.voorstellen(id) on delete cascade,
  kandidaat_id    uuid references public.kandidaten(id) on delete cascade,
  event_type      text not null,           -- voorstel_verstuurd / voorstel_geopend / reminder_verstuurd /
                                            -- voorstel_groen / voorstel_rood / kennismaking_gepland /
                                            -- kennismaking_reminder / plaatsing / afwijzing
  beschrijving    text,                    -- korte tekst voor UI
  zichtbaar_voor_kandidaat boolean default false,
  metadata        jsonb,
  created_at      timestamptz default now()
);

create index if not exists voorstel_logs_voorstel_idx on public.voorstel_logs (voorstel_id);
create index if not exists voorstel_logs_kandidaat_idx on public.voorstel_logs (kandidaat_id);
create index if not exists voorstel_logs_event_idx on public.voorstel_logs (event_type);
create index if not exists voorstel_logs_created_idx on public.voorstel_logs (created_at desc);

alter table public.voorstel_logs enable row level security;

create policy "Voorstel-logs eigen tenant lezen"
  on public.voorstel_logs for select
  using (tenant_id = public.my_tenant_id());

create policy "Voorstel-logs eigen tenant insert"
  on public.voorstel_logs for insert
  with check (tenant_id = public.my_tenant_id());
