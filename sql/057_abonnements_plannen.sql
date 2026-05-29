-- Plannen in DB ipv hardcoded — beheerbaar via UI door super-admin
create table if not exists public.abonnements_plannen (
  id uuid primary key default gen_random_uuid(),
  sleutel text not null unique,                  -- starter / pro / enterprise / custom-x
  label text not null,
  prijs_per_maand_cent int not null,
  max_users int,                                  -- null = onbeperkt
  features jsonb not null default '[]'::jsonb,    -- ["Tot X users", "Y feature", ...]
  populair boolean not null default false,
  actief boolean not null default true,
  sortering int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plannen_sortering on public.abonnements_plannen(sortering);
create index if not exists idx_plannen_actief on public.abonnements_plannen(actief);

-- Globale instellingen (key/value)
create table if not exists public.abonnements_instellingen (
  sleutel text primary key,
  waarde text not null,
  updated_at timestamptz not null default now()
);

-- Seed setup-fee
insert into public.abonnements_instellingen (sleutel, waarde)
values ('setup_fee_cent', '49500')
on conflict (sleutel) do nothing;

-- Seed 3 standaard plannen
insert into public.abonnements_plannen
  (sleutel, label, prijs_per_maand_cent, max_users, features, populair, sortering)
values
  ('starter', 'Starter', 4900, 3,
   '["Tot 3 recruiters/setters","Onbeperkt kandidaten","Kanban + voorstellen + agenda","AI CV-parsing + profielschets","E-mailadres + Voys via GRYWO","AVG-compliant"]'::jsonb,
   false, 1),
  ('pro', 'Pro', 9900, 10,
   '["Tot 10 recruiters/setters","Alles van Starter","Coaching dashboard + EOD","Eigen huisstijl (logo + kleuren)","Contract-controle met AI redactie","Prioriteit support"]'::jsonb,
   true, 2),
  ('enterprise', 'Enterprise', 19900, null,
   '["Onbeperkte users","Alles van Pro","Custom integraties op verzoek","Dedicated account-manager","SLA-afspraken (99.9%)","Audit-rapportage op verzoek"]'::jsonb,
   false, 3)
on conflict (sleutel) do nothing;
