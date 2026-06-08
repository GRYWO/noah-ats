-- 073: Setter-aanmeldingen via /word-setter
-- Mensen die de samenwerkingsovereenkomst electronisch ondertekenen
-- vanaf de publieke landingspagina. Pepijn handelt verder af in /users.

create table if not exists public.setter_aanmeldingen (
  id                 uuid primary key default gen_random_uuid(),
  voornaam           text not null,
  achternaam         text not null,
  email              text not null,
  telefoon           text,
  handtekening_type  text not null default 'typed',
  handtekening_data  text not null,
  ip_adres           text,
  user_agent         text,
  status             text not null default 'nieuw',
    -- 'nieuw' / 'in_gesprek' / 'gestart' / 'afgewezen'
  notitie            text,
  ondertekend_op     timestamptz not null default now(),
  opgevolgd_op       timestamptz
);

create index if not exists idx_setter_aanmeldingen_status
  on public.setter_aanmeldingen (status, ondertekend_op desc);

alter table public.setter_aanmeldingen enable row level security;

comment on table public.setter_aanmeldingen is
  'Ondertekende samenwerkings-intentieverklaringen via /word-setter. Pepijn ziet ze + handelt af.';
