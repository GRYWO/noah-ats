-- ===========================================================================
-- 115: Leads — labels (gedeeld, kleur, zelf uit te breiden), tijdlijn,
--      herinneringen en CRM-koppeling voor gevonden vacatures + eigen vacatures.
-- Run in de Supabase SQL Editor (productie).
-- ===========================================================================

-- 1) Labels: per tenant gedeeld, met kleur. Iedereen mag erbij maken.
create table if not exists public.lead_labels (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  naam            text not null,
  kleur           text not null default '#64748b',
  is_systeem      boolean not null default false,
  aangemaakt_door uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists lead_labels_tenant_idx on public.lead_labels (tenant_id);

-- 2) Koppeling label <-> lead. Een lead is een jobdigger-vondst ('vondst') of
--    een eigen/geclaimde vacature ('vacature').
create table if not exists public.lead_label_links (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  lead_id         uuid not null,
  lead_type       text not null,            -- 'vondst' | 'vacature'
  label_id        uuid not null references public.lead_labels(id) on delete cascade,
  aangemaakt_door uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (lead_id, lead_type, label_id)
);
create index if not exists lead_label_links_lead_idx on public.lead_label_links (lead_id, lead_type);

-- 3) Tijdlijn: elke notitie/actie wordt een gebeurtenis (contactmoment).
create table if not exists public.lead_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  lead_id         uuid not null,
  lead_type       text not null,
  soort           text not null,            -- 'notitie' | 'label' | 'herinnering' | 'crm' | 'gebeld'
  tekst           text,
  aangemaakt_door uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists lead_events_lead_idx on public.lead_events (lead_id, lead_type, created_at desc);

-- 4) Herinneringen aan een lead koppelen (hergebruik bestaande geplande_notificaties).
alter table public.geplande_notificaties add column if not exists lead_id   uuid;
alter table public.geplande_notificaties add column if not exists lead_type text;

-- 5) Systeemlabels voor elke bestaande tenant: Terugbellen, Interesse, Geen interesse.
insert into public.lead_labels (tenant_id, naam, kleur, is_systeem)
select t.id, x.naam, x.kleur, true
from public.tenants t
cross join (values
  ('Terugbellen', '#f59e0b'),
  ('Interesse', '#16a34a'),
  ('Geen interesse', '#dc2626')
) as x(naam, kleur)
where not exists (
  select 1 from public.lead_labels l
  where l.tenant_id = t.id and l.naam = x.naam and l.is_systeem = true
);

-- 6) RLS als vangnet (de app schrijft via de service-role). Lezen binnen eigen tenant.
alter table public.lead_labels      enable row level security;
alter table public.lead_label_links enable row level security;
alter table public.lead_events      enable row level security;

drop policy if exists lead_labels_sel on public.lead_labels;
create policy lead_labels_sel on public.lead_labels for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

drop policy if exists lead_label_links_sel on public.lead_label_links;
create policy lead_label_links_sel on public.lead_label_links for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

drop policy if exists lead_events_sel on public.lead_events;
create policy lead_events_sel on public.lead_events for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));
