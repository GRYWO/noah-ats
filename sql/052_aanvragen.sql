-- Aanvragen-tabel voor reply-flow tussen bureau en GRYWO
create table if not exists public.aanvragen (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  type text not null check (type in ('email', 'voys', 'bevestiging')),

  -- Aanvrager (de bureau-admin/recruiter die de aanvraag deed)
  aanvrager_user_id uuid references public.profiles(id) on delete set null,
  aanvrager_email text not null,
  aanvrager_naam text,
  tenant_id uuid references public.tenants(id) on delete set null,
  bureau_naam text,

  -- Inhoud
  voor_voornaam text,        -- voor wie email/voys (alleen bij type=email/voys)
  voor_achternaam text,
  bericht text,              -- alleen bij type=bevestiging

  -- Reply van GRYWO
  reply_bericht text,
  reply_verzonden_op timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists idx_aanvragen_token on public.aanvragen(token);
create index if not exists idx_aanvragen_tenant on public.aanvragen(tenant_id);

-- Geen RLS — we gebruiken admin-client + token-validatie
