-- ===========================================
-- Tenants tabel uitbreiden met alle bedrijfsgegevens
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.tenants
  add column if not exists handelsnaam      text,
  add column if not exists rechtsvorm       text,
  add column if not exists btw_id           text,
  add column if not exists land             text,
  add column if not exists telefoon         text,
  add column if not exists algemeen_email   text,
  add column if not exists bic              text,
  add column if not exists tenaamstelling   text,
  add column if not exists finance_email    text,
  add column if not exists contact_naam     text,
  add column if not exists contact_functie  text,
  add column if not exists contact_tel      text,
  add column if not exists contact_email    text,
  add column if not exists ubo_naam         text,
  add column if not exists ubo_geboortedatum date;

-- Super-admin policy: laat 1 specifieke user alle tenants zien
-- (Wij gebruiken email-check in code, niet in policy)
-- Hier voegen we een policy toe waarbij geauthenticeerde users hun eigen tenant zien
-- + iedereen mag tenants tabel queryen (RLS check in app via service role)

-- Allow super admin to read all (we use admin client in code, dus niet strikt nodig)

-- Allow insert for authenticated (gebruiken admin client met service role)
drop policy if exists "Eigen tenant lezen" on public.tenants;

create policy "Eigen tenant lezen"
  on public.tenants for select
  using (id = public.my_tenant_id());
