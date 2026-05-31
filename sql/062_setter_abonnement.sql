-- 062: Setter-abonnementen
-- Setters betalen €250/mnd via eigen Stripe-subscription.
-- Zonder actief abonnement kan setter niet inloggen.

-- Velden op profiles
alter table public.profiles
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text,
  add column if not exists abonnement_status       text default 'geen',
    -- 'geen' / 'wachtend_betaling' / 'actief' / 'opgezegd' / 'achterstallig'
  add column if not exists abonnement_actief_sinds timestamptz,
  add column if not exists abonnement_opgezegd_op  timestamptz;

create index if not exists idx_profiles_abonnement_status
  on public.profiles (abonnement_status) where rol = 'setter';

-- Nieuw plan: "setter_stoel" — €250/mnd, voor individuele setters
insert into public.abonnements_plannen (
  sleutel, label, prijs_per_maand_cent, max_users, features, populair, actief, sortering
) values (
  'setter_stoel',
  'Setter-stoel',
  25000,
  1,
  jsonb_build_array(
    'Volledige toegang Noah ATS',
    'Eigen kandidaten + voorstellen',
    'Robin AI + Jobdigger',
    'Inbox koppeling',
    'Coaching dashboard'
  ),
  false,
  true,
  100  -- aparte sortering ver achteraan zodat hij niet tussen bureau-plans staat
)
on conflict (sleutel) do update set
  prijs_per_maand_cent = excluded.prijs_per_maand_cent,
  features = excluded.features,
  actief = true;

comment on column public.profiles.abonnement_status is
  'Setter-abonnement status. Bij rol=setter moet status=actief om in te kunnen loggen.';
