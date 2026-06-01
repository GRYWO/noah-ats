-- 066: Plan-keuze bewaren tot Stripe-mail wordt verstuurd
-- Bureau krijgt na DPA-tekenen direct de Stripe-checkout-mail voor dit plan.

alter table public.tenants
  add column if not exists gekozen_plan text default 'starter';

comment on column public.tenants.gekozen_plan is
  'Bij bureau-aanmaak gekozen abonnement (starter/pro/enterprise). '
  'Wordt na DPA-ondertekening gebruikt om Stripe checkout te starten.';
