-- ===========================================
-- Plaatsingen — deal-details bij status "geplaatst"
-- Wordt ingevuld door setter/recruiter zodra een kandidaat is geplaatst.
-- Triggert mail naar backoffice@grywo.nl voor de financiële afhandeling.
-- ===========================================

create table if not exists public.plaatsingen (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  kandidaat_id    uuid references public.kandidaten(id) on delete cascade,
  voorstel_id     uuid references public.voorstellen(id) on delete set null,

  -- Deal-type
  basis           text not null check (basis in ('uitzend', 'werving_selectie')),

  -- Tarief: één van twee gevuld, afhankelijk van basis
  tarief_factor   numeric,   -- uitzend: 2.3 / 2.4 / 2.5
  tarief_pct      numeric,   -- werving_selectie: 15 / 16 / 17

  -- Betaalcondities
  betaling        text not null check (betaling in ('1x_7d', '50_50_7d_30d')),

  -- Klant-info (kopie ten tijde van plaatsing voor audit-trail)
  bedrijf         text,
  contactpersoon  text,
  contact_email   text,
  contact_telefoon text,
  opmerking       text,

  -- Wie heeft aangemeld
  aangemeld_door  uuid references public.profiles(id) on delete set null,
  backoffice_mail_sent timestamptz,
  created_at      timestamptz default now()
);

create index if not exists plaatsingen_kandidaat_idx on public.plaatsingen (kandidaat_id);
create index if not exists plaatsingen_tenant_idx   on public.plaatsingen (tenant_id, created_at desc);

alter table public.plaatsingen enable row level security;

create policy "Plaatsingen eigen tenant lezen"
  on public.plaatsingen for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Plaatsingen eigen tenant aanmaken"
  on public.plaatsingen for insert
  with check (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));
