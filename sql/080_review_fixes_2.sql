-- 080_review_fixes_2.sql
-- Tweede ronde review-fixes (feature/midden/laag).
--
-- 1) Ondertekentokens (user_agreements) krijgen een vervaldatum zodat een
--    niet-getekende uitnodiging niet eeuwig geldig blijft (#41/#43).
--    Bestaande rijen houden NULL = geen verval (geen breaking change).

alter table public.user_agreements
  add column if not exists verloopt_op timestamptz;

comment on column public.user_agreements.verloopt_op is
  'Vervaldatum van de teken-uitnodiging. Na deze datum kan niet meer getekend worden. NULL = geen verval (legacy).';

-- 2) Handmatig vastgezet abonnement: zet dit op true wanneer een admin/super
--    het plan met de hand kiest. De auto-upgrade-logica laat zo'n abonnement
--    dan met rust (#29) i.p.v. ongevraagd het plan te wijzigen.
alter table public.abonnementen
  add column if not exists plan_handmatig boolean not null default false;

comment on column public.abonnementen.plan_handmatig is
  'true = plan is handmatig vastgezet; auto-upgrade slaat dit abonnement over.';

-- 3) GRYWO-pool cross-tenant policies aanscherpen (#12).
--    De oude policies gaven IEDERE gebruiker die eigenaar/setter van een rij is
--    cross-tenant inzage, ongeacht of hij echt tot de GRYWO-pool hoort. Nu
--    vereisen we dat de gebruiker een ACTIEF lid is van een is_grywo_pool-tenant.

create or replace function public.is_actief_pool_lid()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.profiles p
    join public.tenants t on t.id = p.tenant_id
    where p.id = auth.uid()
      and t.is_grywo_pool
      and coalesce(p.is_active, true)
  );
$$;

drop policy if exists "Setter ziet eigen toegewezen kandidaten cross-tenant" on public.kandidaten;
create policy "Setter ziet eigen toegewezen kandidaten cross-tenant"
  on public.kandidaten for select
  using (eigenaar_id = auth.uid() and public.is_actief_pool_lid());

drop policy if exists "Setter mag eigen toegewezen kandidaten updaten" on public.kandidaten;
create policy "Setter mag eigen toegewezen kandidaten updaten"
  on public.kandidaten for update
  using (eigenaar_id = auth.uid() and public.is_actief_pool_lid());

drop policy if exists "Setter ziet eigen voorstellen cross-tenant" on public.voorstellen;
create policy "Setter ziet eigen voorstellen cross-tenant"
  on public.voorstellen for select
  using (setter_id = auth.uid() and public.is_actief_pool_lid());

drop policy if exists "Setter mag eigen voorstellen updaten" on public.voorstellen;
create policy "Setter mag eigen voorstellen updaten"
  on public.voorstellen for update
  using (setter_id = auth.uid() and public.is_actief_pool_lid());
