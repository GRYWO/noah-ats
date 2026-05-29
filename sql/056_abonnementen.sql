-- Abonnementen-systeem (Stripe-gedreven, 3-tier)
-- Plans: Starter (€49 / max 3 users) / Pro (€99 / max 10) / Enterprise (€199 / unlimited)
-- Setup-fee: €495 eenmalig bij activatie

create table if not exists public.abonnementen (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade unique,

  plan text not null check (plan in ('starter','pro','enterprise')),
  status text not null default 'concept'
    check (status in ('concept','actief','achterstallig','read_only','geblokkeerd','opgezegd')),

  -- Limieten (afgeleid uit plan)
  max_users int,
  prijs_per_maand_cent int not null,

  -- Stripe-koppeling
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,

  -- Setup-fee
  setup_fee_cent int not null default 49500,
  setup_fee_betaald boolean not null default false,
  setup_fee_invoice_id text,

  -- Cycli
  gestart_op timestamptz,
  huidige_periode_start timestamptz,
  huidige_periode_einde timestamptz,
  opgezegd_op timestamptz,
  beeindigd_op timestamptz,

  -- Wanbetaling-tracker
  laatste_reminder_op timestamptz,
  read_only_sinds timestamptz,
  geblokkeerd_sinds timestamptz,

  -- Notities
  opmerking text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_abonnementen_tenant on public.abonnementen(tenant_id);
create index if not exists idx_abonnementen_status on public.abonnementen(status);
create index if not exists idx_abonnementen_periode_einde on public.abonnementen(huidige_periode_einde);

-- Facturen-log (gemirrored vanuit Stripe webhooks)
create table if not exists public.facturen (
  id uuid primary key default gen_random_uuid(),
  abonnement_id uuid not null references public.abonnementen(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,

  stripe_invoice_id text unique,
  factuurnummer text,
  bedrag_excl_cent int not null,
  btw_cent int not null default 0,
  totaal_cent int not null,
  valuta text not null default 'eur',

  status text not null default 'verzonden'
    check (status in ('concept','verzonden','betaald','te_laat','oninbaar','gestorneerd')),
  type text not null default 'abonnement'
    check (type in ('setup_fee','abonnement','correctie')),

  factuurdatum date,
  vervaldatum date,
  betaald_op timestamptz,
  pdf_url text,

  created_at timestamptz not null default now()
);

create index if not exists idx_facturen_abonnement on public.facturen(abonnement_id);
create index if not exists idx_facturen_tenant on public.facturen(tenant_id);
create index if not exists idx_facturen_status on public.facturen(status);

comment on table public.abonnementen is
  '1-op-1 met tenant. Status-machine: concept → actief → '
  '(achterstallig → read_only → geblokkeerd) of (opgezegd). '
  'Stripe-gedreven, met fallback voor handmatige bypass door super-admin.';
comment on table public.facturen is
  'Mirror van Stripe invoices voor lokale weergave + AVG-bewaartermijn (7 jaar).';
