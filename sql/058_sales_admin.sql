-- Sales-admin permissie: kan bureaus aanmaken + abonnementen activeren,
-- maar geen prijzen/tarieven aanpassen (alleen super-admin).
alter table public.profiles
  add column if not exists kan_abonnementen_beheren boolean not null default false;

create index if not exists idx_profiles_sales_admin
  on public.profiles(kan_abonnementen_beheren)
  where kan_abonnementen_beheren = true;

comment on column public.profiles.kan_abonnementen_beheren is
  'Sales-admin: mag bureaus aanmaken + abonnementen activeren. '
  'Mag NIET plannen/tarieven aanpassen (alleen super-admin). '
  'Wordt beheerd door Yorith via /setters.';
