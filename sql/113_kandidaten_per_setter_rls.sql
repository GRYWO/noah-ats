-- ===========================================
-- Per-setter isolatie op kandidaten (RLS)
--
-- ⚠️ EERST OP DE TESTOMGEVING DRAAIEN EN ALLE FLOWS CONTROLEREN, daarna pas
--    op productie. Een fout in RLS kan kernpagina's blokkeren.
--
-- Doel: een setter ziet/wijzigt alleen zijn EIGEN kandidaten (eigenaar_id =
-- ingelogde gebruiker). Admins/super-admins (Yorith, Pepijn, Wouter) zien
-- alles. Onbeheerde kandidaten (talentpool, eigenaar_id IS NULL) blijven voor
-- iedereen zichtbaar zodat ze geclaimd kunnen worden.
--
-- Let op: server-acties die de SERVICE-ROLE (admin) client gebruiken omzeilen
-- RLS sowieso; die blijven ongewijzigd werken. RLS beschermt hier vooral de
-- directe user-client toegang (kandidaatpagina, kanban) tegen het bekijken/
-- wijzigen van andermans kandidaten via een directe URL of request.
-- ===========================================

-- Helper: is de huidige gebruiker een team-admin (admin of super-admin)?
create or replace function public.is_team_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.rol, '')) in ('admin', 'super-admin', 'super_admin')
  );
$$;

-- De oude tenant-brede lees/wijzig-policies vervangen door per-setter policies.
drop policy if exists "Eigen tenant kandidaten lezen"   on public.kandidaten;
drop policy if exists "Eigen tenant kandidaten updaten" on public.kandidaten;

create policy "Setter eigen kandidaten lezen" on public.kandidaten
  for select using (
    tenant_id = public.my_tenant_id()
    and (
      eigenaar_id = auth.uid()
      or eigenaar_id is null          -- talentpool / onbeheerd: claimbaar door iedereen
      or public.is_team_admin()
    )
  );

create policy "Setter eigen kandidaten updaten" on public.kandidaten
  for update using (
    tenant_id = public.my_tenant_id()
    and (
      eigenaar_id = auth.uid()
      or eigenaar_id is null
      or public.is_team_admin()
    )
  );

-- Toevoegen (insert) blijft tenant-breed: elke setter mag binnen het eigen
-- bureau een kandidaat aanmaken. (Policy "Eigen tenant kandidaten toevoegen"
-- blijft staan.)
