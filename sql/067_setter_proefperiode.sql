-- 067: Proefperiode van 5 werkdagen voor nieuwe setters
-- Setter krijgt direct toegang, na 5 werkdagen verloopt de proef en
-- moet hij betalen via Stripe. Zonder betaling = geblokkeerd.

alter table public.profiles
  add column if not exists proefperiode_eindigt_op timestamptz,
  add column if not exists proefperiode_mail_verstuurd boolean not null default false;

comment on column public.profiles.proefperiode_eindigt_op is
  '5 werkdagen na aanmaak van setter. Tot deze datum mag setter inloggen '
  'zonder actief abonnement. Daarna: middleware blokkeert + cron stuurt Stripe-mail.';

comment on column public.profiles.proefperiode_mail_verstuurd is
  'Voorkomt dat cron meermaals de Stripe-mail verstuurt na proef-einde.';

-- Index voor cron-job (snel vinden van verlopen proefperiodes)
create index if not exists idx_profiles_proefperiode_eind
  on public.profiles (proefperiode_eindigt_op)
  where rol = 'setter' and abonnement_status in ('geen', 'proefperiode');
