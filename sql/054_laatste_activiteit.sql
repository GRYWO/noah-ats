-- Real-time "wie is online" tracking
alter table public.profiles
  add column if not exists laatst_actief_op timestamptz;

create index if not exists idx_profiles_laatst_actief
  on public.profiles(laatst_actief_op desc);

comment on column public.profiles.laatst_actief_op is
  'Timestamp van laatste page-load. Geupdate via TopBar (throttle 1min). '
  'Gebruik voor "Wie is online"-widget op super-admin dashboard.';
