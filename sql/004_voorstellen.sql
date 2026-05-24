-- ===========================================
-- VOORSTELLEN tabel (kandidaat → opdrachtgever)
-- Run in Supabase SQL Editor
-- ===========================================

create table public.voorstellen (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid references public.tenants(id) on delete cascade,
  kandidaat_id        uuid references public.kandidaten(id) on delete cascade,
  setter_id           uuid references public.profiles(id) on delete set null,

  opdrachtgever_email text not null,
  opdrachtgever_naam  text,
  bericht             text,
  token               text not null unique default replace(gen_random_uuid()::text, '-', ''),

  status              text default 'verzonden',  -- verzonden / uitnodigen / niet_uitnodigen / verlopen

  -- Bij groen-klik (opdrachtgever vult in)
  bedrijf             text,
  contactpersoon      text,
  contact_telefoon    text,
  contact_email       text,
  locatie_url         text,
  datum_1             timestamptz,
  datum_2             timestamptz,
  datum_3             timestamptz,
  opmerking           text,
  reactie_op          timestamptz,

  -- Reminder tracking
  reminder_1_sent     timestamptz,
  reminder_2_sent     timestamptz,
  reminder_3_sent     timestamptz,
  reminder_4_sent     timestamptz,
  verlopen_op         timestamptz,

  verzonden_op        timestamptz default now(),
  created_at          timestamptz default now()
);

create index on public.voorstellen (tenant_id);
create index on public.voorstellen (kandidaat_id);
create index on public.voorstellen (token);
create index on public.voorstellen (status);

-- RLS aan
alter table public.voorstellen enable row level security;

-- Eigen tenant lezen/schrijven
create policy "Voorstellen eigen tenant lezen"
  on public.voorstellen for select
  using (tenant_id = public.my_tenant_id());

create policy "Voorstellen eigen tenant insert"
  on public.voorstellen for insert
  with check (tenant_id = public.my_tenant_id());

create policy "Voorstellen eigen tenant update"
  on public.voorstellen for update
  using (tenant_id = public.my_tenant_id());

create policy "Voorstellen eigen tenant delete"
  on public.voorstellen for delete
  using (tenant_id = public.my_tenant_id());
