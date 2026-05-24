-- ===========================================
-- BELLIJSTEN (Jobdigger imports)
-- Run in Supabase SQL Editor
-- ===========================================

create table if not exists public.bellijsten (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete cascade,
  kandidaat_id  uuid references public.kandidaten(id) on delete cascade,
  setter_id     uuid references public.profiles(id) on delete set null,
  naam          text not null,
  aantal_items  int default 0,
  bron          text default 'jobdigger',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists bellijsten_kandidaat_idx on public.bellijsten (kandidaat_id);
create index if not exists bellijsten_tenant_idx on public.bellijsten (tenant_id);

alter table public.bellijsten enable row level security;

create policy "Bellijsten eigen tenant lezen"
  on public.bellijsten for select using (tenant_id = public.my_tenant_id());
create policy "Bellijsten eigen tenant insert"
  on public.bellijsten for insert with check (tenant_id = public.my_tenant_id());
create policy "Bellijsten eigen tenant update"
  on public.bellijsten for update using (tenant_id = public.my_tenant_id());
create policy "Bellijsten eigen tenant delete"
  on public.bellijsten for delete using (tenant_id = public.my_tenant_id());

create table if not exists public.bellijst_items (
  id              uuid primary key default gen_random_uuid(),
  bellijst_id     uuid references public.bellijsten(id) on delete cascade,
  tenant_id       uuid references public.tenants(id) on delete cascade,
  functie         text,
  bedrijf         text,
  plaats          text,
  postcode        text,
  telefoon        text,
  website         text,
  branche         text,
  label           text,           -- 'gebeld' | 'callback' | 'niet_bellen' | 'geinteresseerd' | 'afgewezen'
  status          text default 'open', -- 'open' | 'gedaan'
  notitie         text,
  opdrachtgever_id uuid references public.opdrachtgevers(id) on delete set null,
  raw_data        jsonb,
  volgorde        int default 0,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists bellijst_items_bellijst_idx on public.bellijst_items (bellijst_id);
create index if not exists bellijst_items_tenant_idx on public.bellijst_items (tenant_id);

alter table public.bellijst_items enable row level security;

create policy "Bellijst-items eigen tenant lezen"
  on public.bellijst_items for select using (tenant_id = public.my_tenant_id());
create policy "Bellijst-items eigen tenant insert"
  on public.bellijst_items for insert with check (tenant_id = public.my_tenant_id());
create policy "Bellijst-items eigen tenant update"
  on public.bellijst_items for update using (tenant_id = public.my_tenant_id());
create policy "Bellijst-items eigen tenant delete"
  on public.bellijst_items for delete using (tenant_id = public.my_tenant_id());
