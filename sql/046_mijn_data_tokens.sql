-- Magic-link tokens voor de publieke /mijn-data flow.
-- Kandidaten vragen via e-mail een persoonlijke inzage-link aan; deze tabel
-- bewaart de uitgegeven tokens met een korte geldigheidsduur.
create table if not exists public.mijn_data_tokens (
  id            uuid primary key default gen_random_uuid(),
  token         text not null unique,
  email         text not null,
  kandidaat_id  uuid references public.kandidaten(id) on delete cascade,
  verloopt_op   timestamptz not null,
  gebruikt_op   timestamptz,
  ip_adres      text,
  user_agent    text,
  created_at    timestamptz not null default now()
);
create unique index if not exists idx_mdt_token on public.mijn_data_tokens(token);
create index if not exists idx_mdt_email on public.mijn_data_tokens(email);

alter table public.mijn_data_tokens enable row level security;
-- Geen RLS policies — alleen toegankelijk via service-role server-side.

comment on table public.mijn_data_tokens is
  'Magic-link tokens voor /mijn-data — kandidaten vragen inzage of verwijdering aan via mail.';
