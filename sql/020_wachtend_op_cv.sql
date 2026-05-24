-- ===========================================
-- Personen in afwachting van CV (nog geen kandidaat)
-- Run in Supabase SQL Editor
-- ===========================================

create table if not exists public.wachtend_op_cv (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants(id) on delete cascade,
  voornaam    text not null,
  achternaam  text not null,
  telefoon    text,
  email       text,
  notitie     text,
  aangemaakt_door uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

create index if not exists wachtend_op_cv_tenant_idx on public.wachtend_op_cv (tenant_id);
create index if not exists wachtend_op_cv_created_idx on public.wachtend_op_cv (created_at);

alter table public.wachtend_op_cv enable row level security;

create policy "Wachtenden eigen tenant lezen"
  on public.wachtend_op_cv for select
  using (tenant_id = public.my_tenant_id());

create policy "Wachtenden eigen tenant insert"
  on public.wachtend_op_cv for insert
  with check (tenant_id = public.my_tenant_id());

create policy "Wachtenden eigen tenant delete"
  on public.wachtend_op_cv for delete
  using (tenant_id = public.my_tenant_id());
