-- ===========================================
-- ZOEK_JOBS — opdrachtenwachtrij voor de altijd-aan machine (bot)
-- Run in Supabase SQL Editor
--
-- De zoekbalk/knop in de ATS zet hier een opdracht in ('robin' of 'jobdigger').
-- De bot (ingelogd als Yorith) haalt openstaande opdrachten op, draait de
-- zoekopdracht en meldt het resultaat terug.
-- ===========================================

create table if not exists public.zoek_jobs (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid references public.tenants(id) on delete cascade,
  type             text not null,                  -- 'robin' | 'jobdigger'
  zoekterm         text not null,                  -- functie/beroep
  vacature_id      uuid references public.rec_vacatures(id) on delete set null,
  status           text not null default 'open',   -- 'open' | 'bezig' | 'klaar' | 'fout'
  resultaat        jsonb,                          -- samenvatting (aantal, bellijst_id, ...)
  fout             text,
  aangemaakt_door  uuid references public.profiles(id) on delete set null,
  gestart_at       timestamptz,
  klaar_at         timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists zoek_jobs_status_idx on public.zoek_jobs (status, created_at);
create index if not exists zoek_jobs_tenant_idx on public.zoek_jobs (tenant_id);

alter table public.zoek_jobs enable row level security;

-- Setters/recruiters zien en maken jobs binnen hun eigen tenant.
-- De bot gebruikt de service-role key en omzeilt RLS.
create policy "zoek_jobs eigen tenant lezen"
  on public.zoek_jobs for select using (tenant_id = public.my_tenant_id());
create policy "zoek_jobs eigen tenant insert"
  on public.zoek_jobs for insert with check (tenant_id = public.my_tenant_id());
