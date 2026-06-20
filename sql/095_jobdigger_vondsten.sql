-- ===========================================
-- JOBDIGGER_VONDSTEN — resultaten van een Jobdigger-zoekopdracht
-- Run in Supabase SQL Editor
--
-- De zoekbalk (beroep) zet een 'jobdigger'-opdracht in zoek_jobs; de bot scrapet
-- Jobdigger en levert hier de gevonden vacatures aan. De setter plaatst ze
-- vervolgens met "Controleer en plaats".
-- ===========================================

create table if not exists public.jobdigger_vondsten (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references public.zoek_jobs(id) on delete cascade,
  tenant_id    uuid references public.tenants(id) on delete cascade,
  titel        text,
  bedrijf      text,
  plaats       text,
  url          text,
  raw_data     jsonb,
  geplaatst    boolean default false,
  vacature_id  uuid references public.rec_vacatures(id) on delete set null,
  created_at   timestamptz default now()
);

create index if not exists jobdigger_vondsten_tenant_idx on public.jobdigger_vondsten (tenant_id, created_at desc);
create index if not exists jobdigger_vondsten_job_idx on public.jobdigger_vondsten (job_id);

alter table public.jobdigger_vondsten enable row level security;

create policy "jobdigger_vondsten eigen tenant lezen"
  on public.jobdigger_vondsten for select using (tenant_id = public.my_tenant_id());
create policy "jobdigger_vondsten eigen tenant update"
  on public.jobdigger_vondsten for update using (tenant_id = public.my_tenant_id());
