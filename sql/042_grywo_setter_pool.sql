-- ===========================================
-- GRYWO setter-pool: setters horen bij 1 GRYWO-tenant en bedienen
-- kandidaten van ALLE aangemelde bureaus automatisch.
--
-- 1. Markeer 1 tenant als de GRYWO-pool
-- 2. Sta RLS toe dat setters kandidaten/voorstellen kunnen lezen+updaten
--    waar zij als eigenaar zijn toegewezen, ongeacht tenant_id
-- ===========================================

alter table public.tenants
  add column if not exists is_grywo_pool boolean default false;

-- Markeer de bestaande GRYWO-tenant automatisch (voor backwards compat)
update public.tenants
  set is_grywo_pool = true
  where lower(naam) = 'grywo' and is_grywo_pool = false;

-- Cross-tenant policies voor kandidaten — setter ziet kandidaten waar hij
-- als eigenaar is toegewezen, ook als ze bij een ander bureau horen.
create policy if not exists "Setter ziet eigen toegewezen kandidaten cross-tenant"
  on public.kandidaten for select
  using (eigenaar_id = auth.uid());

create policy if not exists "Setter mag eigen toegewezen kandidaten updaten"
  on public.kandidaten for update
  using (eigenaar_id = auth.uid());

-- Voorstellen: setter mag voorstellen zien/updaten waar hij als setter
-- staat ingeschreven, ongeacht tenant_id
create policy if not exists "Setter ziet eigen voorstellen cross-tenant"
  on public.voorstellen for select
  using (setter_id = auth.uid());

create policy if not exists "Setter mag eigen voorstellen updaten"
  on public.voorstellen for update
  using (setter_id = auth.uid());
