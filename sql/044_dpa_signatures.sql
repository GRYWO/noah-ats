-- Inline elektronische ondertekening van DPA's per bureau.
-- Eén actief record per tenant (oude records houden voor audit-trail).
create table if not exists public.dpa_signatures (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenants(id) on delete cascade,
  token                   text not null unique,
  status                  text not null default 'wachtend' check (status in ('wachtend','getekend','ingetrokken')),

  -- Wie hebben we gevraagd om te tekenen
  verzonden_aan_email     text not null,
  verzonden_aan_naam      text,
  verzonden_door          uuid references auth.users(id) on delete set null,
  verzonden_op            timestamptz not null default now(),

  -- Bureau-snapshot op moment van versturen (voor de DPA-tekst)
  bureau_naam             text,
  bureau_handelsnaam      text,
  bureau_kvk              text,
  bureau_adres            text,

  -- Ondertekening
  getekend_door_naam      text,
  getekend_door_functie   text,
  getekend_door_email     text,
  getekend_op             timestamptz,
  handtekening_type       text check (handtekening_type in ('typed','drawn')),
  handtekening_data       text,   -- typed: naam-string; drawn: base64 PNG van canvas
  akkoord_avg             boolean default false,
  ip_adres                text,
  user_agent              text
);

create index if not exists idx_dpa_tenant on public.dpa_signatures(tenant_id);
create index if not exists idx_dpa_status on public.dpa_signatures(status);
create unique index if not exists idx_dpa_token on public.dpa_signatures(token);

-- RLS: super-admin via admin-client, publieke flow via token (geen RLS-check daar — server-side via service-role)
alter table public.dpa_signatures enable row level security;

-- Bureau-admins mogen alleen hun eigen tenant zien
drop policy if exists dpa_select_eigen_tenant on public.dpa_signatures;
create policy dpa_select_eigen_tenant on public.dpa_signatures
  for select using (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid())
  );

comment on table public.dpa_signatures is 'Verwerkersovereenkomsten — uitnodiging tot ondertekenen, status en audit-trail per bureau.';
