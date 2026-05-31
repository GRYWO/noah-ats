-- 064: Interne notities per abonnement (alleen super-admin ziet)
-- Per bureau OF per setter-user kan een vrije tekst notitie staan.

create table if not exists public.abonnement_notities (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  notitie       text not null,
  gemaakt_door  uuid references auth.users(id) on delete set null,
  gemaakt_op    timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  -- Precies één van beide moet gevuld zijn
  check (
    (tenant_id is not null and user_id is null)
    or (tenant_id is null and user_id is not null)
  )
);

create index if not exists idx_abonnement_notities_tenant on public.abonnement_notities (tenant_id);
create index if not exists idx_abonnement_notities_user on public.abonnement_notities (user_id);

alter table public.abonnement_notities enable row level security;

-- Alleen super-admin leest/schrijft (afgedwongen in server-actions)
-- We zetten geen open RLS policy zodat anon-client niks kan.
comment on table public.abonnement_notities is
  'Interne notities per abonnement. Alleen super-admin via service-role client.';
