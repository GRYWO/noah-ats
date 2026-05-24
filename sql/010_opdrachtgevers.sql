-- ===========================================
-- Opdrachtgevers CRM
-- Run in Supabase SQL Editor
-- ===========================================

create table public.opdrachtgevers (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants(id) on delete cascade,
  eigenaar_id uuid references public.profiles(id) on delete set null,

  naam        text not null,
  kvk         text,
  btw_nummer  text,
  adres       text,
  plaats      text,
  website     text,
  branche     text,
  status      text default 'lead',  -- lead / prospect / klant / ex_klant / partner

  laatste_contact timestamptz,
  notitie     text,
  tags        text[],

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index on public.opdrachtgevers (tenant_id);
create index on public.opdrachtgevers (status);
create index on public.opdrachtgevers (eigenaar_id);

create table public.contactpersonen (
  id              uuid primary key default gen_random_uuid(),
  opdrachtgever_id uuid not null references public.opdrachtgevers(id) on delete cascade,
  tenant_id       uuid references public.tenants(id) on delete cascade,

  voornaam        text not null,
  tussenvoegsel   text,
  achternaam      text not null,
  functie         text,
  telefoon        text,
  email           text,
  primair         boolean default false,
  notitie         text,

  created_at      timestamptz default now()
);

create index on public.contactpersonen (opdrachtgever_id);
create index on public.contactpersonen (tenant_id);

-- Auto-update updated_at
create trigger trg_opdrachtgevers_updated
  before update on public.opdrachtgevers
  for each row execute function public.set_updated_at();

-- RLS
alter table public.opdrachtgevers   enable row level security;
alter table public.contactpersonen  enable row level security;

create policy "Opdrachtgevers eigen tenant lezen"
  on public.opdrachtgevers for select
  using (tenant_id = public.my_tenant_id());

create policy "Opdrachtgevers eigen tenant insert"
  on public.opdrachtgevers for insert
  with check (tenant_id = public.my_tenant_id());

create policy "Opdrachtgevers eigen tenant update"
  on public.opdrachtgevers for update
  using (tenant_id = public.my_tenant_id());

create policy "Opdrachtgevers eigen tenant delete"
  on public.opdrachtgevers for delete
  using (tenant_id = public.my_tenant_id());

create policy "Contactpersonen eigen tenant lezen"
  on public.contactpersonen for select
  using (tenant_id = public.my_tenant_id());

create policy "Contactpersonen eigen tenant insert"
  on public.contactpersonen for insert
  with check (tenant_id = public.my_tenant_id());

create policy "Contactpersonen eigen tenant update"
  on public.contactpersonen for update
  using (tenant_id = public.my_tenant_id());

create policy "Contactpersonen eigen tenant delete"
  on public.contactpersonen for delete
  using (tenant_id = public.my_tenant_id());
