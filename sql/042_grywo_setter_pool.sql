-- ===========================================
-- GRYWO setter-pool: setters horen bij 1 GRYWO-tenant en bedienen
-- kandidaten van ALLE aangemelde bureaus automatisch.
-- ===========================================

alter table public.tenants
  add column if not exists is_grywo_pool boolean default false;

-- Markeer bestaande GRYWO-tenant automatisch
update public.tenants
  set is_grywo_pool = true
  where lower(naam) = 'grywo' and is_grywo_pool = false;

-- Cross-tenant policies — drop eerst (idempotent), dan opnieuw maken
drop policy if exists "Setter ziet eigen toegewezen kandidaten cross-tenant" on public.kandidaten;
create policy "Setter ziet eigen toegewezen kandidaten cross-tenant"
  on public.kandidaten for select
  using (eigenaar_id = auth.uid());

drop policy if exists "Setter mag eigen toegewezen kandidaten updaten" on public.kandidaten;
create policy "Setter mag eigen toegewezen kandidaten updaten"
  on public.kandidaten for update
  using (eigenaar_id = auth.uid());

drop policy if exists "Setter ziet eigen voorstellen cross-tenant" on public.voorstellen;
create policy "Setter ziet eigen voorstellen cross-tenant"
  on public.voorstellen for select
  using (setter_id = auth.uid());

drop policy if exists "Setter mag eigen voorstellen updaten" on public.voorstellen;
create policy "Setter mag eigen voorstellen updaten"
  on public.voorstellen for update
  using (setter_id = auth.uid());
