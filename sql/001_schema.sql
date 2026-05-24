-- ===========================================
-- NOAH ATS — Database Schema v1
-- Run this in Supabase SQL Editor (one-time)
-- ===========================================

-- ============ TENANTS (bureaus die Noah kopen) ============
create table public.tenants (
  id              uuid primary key default gen_random_uuid(),
  naam            text not null,
  kvk             text,
  btw_nummer      text,
  iban            text,
  vestigingsadres text,
  factuuradres    text,
  marge_split     numeric default 0.50,   -- 0.50 = 50/50
  setup_fee_paid  boolean default false,
  status          text default 'actief',  -- actief / setup / inactief
  created_at      timestamptz default now()
);

-- ============ PROFILES (extra info per ingelogde user) ============
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid references public.tenants(id) on delete set null,
  voornaam    text,
  achternaam  text,
  rol         text not null default 'setter',  -- admin / recruiter / setter
  telefoon    text,
  voys_nummer text,
  discord_id  text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ============ KANDIDATEN ============
create table public.kandidaten (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  eigenaar_id     uuid references public.profiles(id) on delete set null,
  voornaam        text not null,
  tussenvoegsel   text,
  achternaam      text not null,
  email           text,
  telefoon        text,
  geslacht        text,
  leeftijd        int,
  woonplaats      text,
  opleiding       text,
  open_voor       text,
  tarief_ws       text,
  rijbewijs       text,
  eigen_vervoer   boolean,
  status          text default 'nieuw',  -- nieuw / talentpool / in_proces / bemiddelbaar / geplaatst
  kanban_stap     text default 'nieuwe_sollicitatie',
  score           int,                   -- 0-100 uit CV screening
  cv_url          text,                  -- pad in Supabase Storage
  beschikbare_data jsonb,                -- ["2026-05-28","2026-05-30","2026-06-02"]
  notitie         text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============ INDEXES ============
create index on public.kandidaten (tenant_id);
create index on public.kandidaten (eigenaar_id);
create index on public.kandidaten (status);

-- ============ AUTO-UPDATE updated_at ============
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_kandidaten_updated
  before update on public.kandidaten
  for each row execute function public.set_updated_at();

-- ============ ROW LEVEL SECURITY (RLS) ============
-- Iedereen alleen z'n eigen tenant zien
alter table public.tenants     enable row level security;
alter table public.profiles    enable row level security;
alter table public.kandidaten  enable row level security;

-- PROFILES: user mag eigen profile lezen + admins mogen alles
create policy "Eigen profile lezen"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Eigen profile updaten"
  on public.profiles for update
  using (auth.uid() = id);

-- TENANTS: user ziet alleen eigen tenant
create policy "Eigen tenant lezen"
  on public.tenants for select
  using (id in (select tenant_id from public.profiles where id = auth.uid()));

-- KANDIDATEN: user ziet alleen kandidaten van eigen tenant
create policy "Eigen tenant kandidaten lezen"
  on public.kandidaten for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Eigen tenant kandidaten toevoegen"
  on public.kandidaten for insert
  with check (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Eigen tenant kandidaten updaten"
  on public.kandidaten for update
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

-- ============ EERSTE TENANT + PROFILE (GRYWO + Yorith) ============
-- Voeg GRYWO toe
insert into public.tenants (naam, kvk, marge_split, setup_fee_paid, status)
values ('GRYWO', '12345678', 0.50, true, 'actief')
returning id;

-- Profile voor Yorith (let op: vervang het email-adres als anders)
-- Dit linkt z'n auth.users id aan een profile + tenant
insert into public.profiles (id, tenant_id, voornaam, achternaam, rol)
select
  u.id,
  (select id from public.tenants where naam = 'GRYWO' limit 1),
  'Yorith',
  'Hulzebosch',
  'admin'
from auth.users u
where u.email = 'yorith@grywo.nl';
