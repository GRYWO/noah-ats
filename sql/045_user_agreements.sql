-- Individuele akkoord-flow voor users: setters (NDA), recruiters/admins (gebruiksvoorwaarden).
-- Token = uniek per uitnodiging, publieke link.
create table if not exists public.user_agreements (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  tenant_id               uuid references public.tenants(id) on delete set null,
  token                   text not null unique,
  type                    text not null check (type in ('nda_setter','gebruiksvoorwaarden')),
  status                  text not null default 'wachtend' check (status in ('wachtend','getekend','ingetrokken')),

  -- Wie verstuurd
  verzonden_aan_email     text not null,
  verzonden_aan_naam      text,
  verzonden_door          uuid references auth.users(id) on delete set null,
  verzonden_op            timestamptz not null default now(),

  -- Snapshot voor in het document
  user_voornaam           text,
  user_achternaam         text,
  user_rol                text,
  bureau_naam             text,

  -- Ondertekening
  getekend_door_naam      text,
  getekend_op             timestamptz,
  handtekening_type       text check (handtekening_type in ('typed','drawn')),
  handtekening_data       text,
  akkoord                 boolean default false,
  ip_adres                text,
  user_agent              text
);

create index if not exists idx_ua_user on public.user_agreements(user_id);
create index if not exists idx_ua_status on public.user_agreements(status);
create unique index if not exists idx_ua_token on public.user_agreements(token);

alter table public.user_agreements enable row level security;

-- User mag zijn eigen akkoorden zien
drop policy if exists ua_select_eigen on public.user_agreements;
create policy ua_select_eigen on public.user_agreements
  for select using (user_id = auth.uid());

-- Admin van zelfde tenant mag akkoorden van zijn users zien
drop policy if exists ua_select_admin on public.user_agreements;
create policy ua_select_admin on public.user_agreements
  for select using (
    tenant_id in (
      select tenant_id from public.profiles
      where id = auth.uid() and rol = 'admin'
    )
  );

comment on table public.user_agreements is
  'Geheimhouding/NDA (setters) en gebruiksvoorwaarden (overige users) per individuele user — audit-trail.';
