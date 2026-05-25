-- ===========================================
-- Coaching: EOD-rapporten + 1-op-1 aanvragen + coach-flag
-- ===========================================

-- Pepijn = coach. Vlag op profiel zodat we hem kunnen vinden.
alter table public.profiles
  add column if not exists is_coach boolean default false;

-- Eind-van-dag rapport, verplicht per setter per werkdag
create table if not exists public.eod_rapporten (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid references public.tenants(id) on delete cascade,
  setter_id            uuid references public.profiles(id) on delete cascade,
  rapport_datum        date not null,

  -- Doelen
  doel_vandaag         text,
  doel_behaald         boolean,
  doel_morgen          text,

  -- Activiteit
  aantal_calls         int default 0,
  aantal_voicemails    int default 0,  -- voicemails / geen gehoor
  aantal_voorgesteld   int default 0,
  aantal_afspraken     int default 0,
  aantal_plaatsingen   int default 0,

  -- Reflectie
  obstakel             text,
  afwijzings_reden     text,
  energie_focus        int check (energie_focus between 1 and 5),
  morgen_anders        text,

  created_at           timestamptz default now(),
  unique (setter_id, rapport_datum)
);

create index if not exists eod_setter_datum_idx on public.eod_rapporten (setter_id, rapport_datum desc);
create index if not exists eod_tenant_datum_idx on public.eod_rapporten (tenant_id, rapport_datum desc);

alter table public.eod_rapporten enable row level security;

create policy "EOD: eigen tenant lezen"
  on public.eod_rapporten for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "EOD: eigen rapport schrijven"
  on public.eod_rapporten for insert
  with check (setter_id = auth.uid());

create policy "EOD: eigen rapport updaten (zelfde dag)"
  on public.eod_rapporten for update
  using (setter_id = auth.uid());

-- 1-op-1 coaching-aanvragen
create table if not exists public.coaching_aanvragen (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete cascade,
  setter_id     uuid references public.profiles(id) on delete cascade,
  coach_id      uuid references public.profiles(id) on delete set null,
  bericht       text,
  status        text not null default 'aangevraagd' check (status in ('aangevraagd', 'gepland', 'afgerond', 'geannuleerd')),
  geplande_datum timestamptz,
  reactie       text,
  created_at    timestamptz default now()
);

create index if not exists coaching_aanvragen_setter_idx on public.coaching_aanvragen (setter_id, created_at desc);
create index if not exists coaching_aanvragen_coach_idx on public.coaching_aanvragen (coach_id, status);

alter table public.coaching_aanvragen enable row level security;

create policy "Coaching: tenant lezen"
  on public.coaching_aanvragen for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Coaching: eigen aanvraag insert"
  on public.coaching_aanvragen for insert
  with check (setter_id = auth.uid());

create policy "Coaching: admin/coach update"
  on public.coaching_aanvragen for update
  using (
    tenant_id in (
      select tenant_id from public.profiles
      where id = auth.uid() and (rol = 'admin' or is_coach = true)
    )
  );
