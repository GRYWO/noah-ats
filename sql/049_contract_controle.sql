-- Contract-controle systeem
-- Klant upload contract → AI redactie → naar GRYWO voor facturatie

create table if not exists public.contract_verzoeken (
  id uuid primary key default gen_random_uuid(),
  plaatsing_id uuid references public.plaatsingen(id) on delete set null,
  tenant_id uuid references public.tenants(id) on delete set null,
  token text not null unique,
  status text not null default 'verzonden'
    check (status in ('verzonden','geupload','afgerond','vervallen')),

  -- Klant-info (snapshot uit plaatsing)
  opdrachtgever_naam text not null,
  opdrachtgever_email text not null,
  kandidaat_naam text not null,
  opgegeven_salaris numeric, -- wat de bureau-admin had ingevuld

  -- Extracted uit contract door AI
  contract_salaris numeric,
  contract_functie text,
  contract_startdatum date,
  contract_duur text,
  contract_werkgever text,

  -- Storage paden (privé bucket)
  origineel_pad text, -- max 24u bewaard, dan verwijderd
  geredacteerd_pad text, -- 7 jaar (fiscaal)
  samenvatting_pad text, -- 7 jaar — onze eigen samenvatting

  -- Audit
  verzonden_op timestamptz not null default now(),
  geupload_op timestamptz,
  afgerond_op timestamptz,
  uploader_ip text,
  uploader_ua text,
  redactie_log jsonb, -- wat is allemaal geredacteerd (counts per categorie)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_plaatsing on public.contract_verzoeken(plaatsing_id);
create index if not exists idx_cv_token on public.contract_verzoeken(token);
create index if not exists idx_cv_status on public.contract_verzoeken(status);
create index if not exists idx_cv_tenant on public.contract_verzoeken(tenant_id);

-- RLS — alleen tenant-leden en super-admin kunnen lezen
alter table public.contract_verzoeken enable row level security;

drop policy if exists "Tenant-leden lezen eigen verzoeken" on public.contract_verzoeken;
create policy "Tenant-leden lezen eigen verzoeken"
  on public.contract_verzoeken for select
  to authenticated
  using (
    tenant_id in (
      select tenant_id from public.profiles where id = auth.uid()
    )
  );

drop policy if exists "Tenant-admins maken verzoeken" on public.contract_verzoeken;
create policy "Tenant-admins maken verzoeken"
  on public.contract_verzoeken for insert
  to authenticated
  with check (
    tenant_id in (
      select tenant_id from public.profiles
      where id = auth.uid() and rol in ('admin','recruiter')
    )
  );

drop policy if exists "Tenant-admins updaten verzoeken" on public.contract_verzoeken;
create policy "Tenant-admins updaten verzoeken"
  on public.contract_verzoeken for update
  to authenticated
  using (
    tenant_id in (
      select tenant_id from public.profiles
      where id = auth.uid() and rol in ('admin','recruiter')
    )
  );

-- Storage bucket — privé (alleen via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracten',
  'contracten',
  false,
  10485760, -- 10MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- Service role kan alles (server actions gebruiken admin-client)
-- Anonieme klant-upload gaat via server action (geen direct storage access)

comment on table public.contract_verzoeken is
  'Verzoeken om contract-controle bij plaatsingen. Klant upload origineel; '
  'AI redacteert PII; geredacteerd contract + samenvatting gaan naar GRYWO '
  'voor facturatie. Origineel wordt binnen 24u verwijderd (AVG dataminimalisatie).';
