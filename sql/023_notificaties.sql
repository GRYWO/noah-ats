-- ===========================================
-- Notificaties (in-app)
-- Run in Supabase SQL Editor
-- ===========================================

create table if not exists public.notificaties (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references public.tenants(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,  -- ontvanger
  van_user_id  uuid references public.profiles(id) on delete set null, -- afzender (optioneel)
  type         text not null,         -- voorstel_groen / voorstel_rood / contact_recruiter / plaatsing / etc.
  titel        text not null,
  bericht      text,
  link_url     text,                  -- bv /kandidaten/<id>
  gelezen      boolean default false,
  kandidaat_id uuid references public.kandidaten(id) on delete cascade,
  created_at   timestamptz default now()
);

create index if not exists notificaties_user_idx on public.notificaties (user_id, gelezen, created_at desc);

alter table public.notificaties enable row level security;

create policy "Notificaties eigen ontvangen lezen"
  on public.notificaties for select using (user_id = auth.uid());

create policy "Notificaties eigen markeer gelezen"
  on public.notificaties for update using (user_id = auth.uid());

-- Realtime voor live badge-update
alter publication supabase_realtime add table public.notificaties;
