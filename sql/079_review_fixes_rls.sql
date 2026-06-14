-- ============================================================
-- Noah ATS — migratie 079: RLS-gaten dichten (code-review fixes)
-- Draai dit ÉÉN keer in de Supabase SQL Editor. Idempotent.
-- Sluit cross-tenant datalekken: profiles-escalatie + tabellen zonder RLS.
-- ============================================================

-- ---------- #1: profiles — voorkom dat een gebruiker eigen tenant_id/rol wijzigt ----------
-- De update-policy had geen WITH CHECK; een gebruiker kon zo z'n rol/tenant_id
-- aanpassen (rechten-escalatie / in een andere tenant stappen).
drop policy if exists "Eigen profile updaten" on public.profiles;
create policy "Eigen profile updaten"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Harde grendel via trigger: een ECHTE gebruiker (auth.uid() niet null) mag
-- tenant_id en rol NOOIT wijzigen; de service-role (admin-client, auth.uid()=null)
-- mag dat wél (voor legitiem beheer).
create or replace function public.profiles_block_escalation()
returns trigger language plpgsql security definer as $$
begin
  if auth.uid() is not null then
    if new.tenant_id is distinct from old.tenant_id then
      raise exception 'tenant_id mag niet door de gebruiker gewijzigd worden';
    end if;
    if new.rol is distinct from old.rol then
      raise exception 'rol mag niet door de gebruiker gewijzigd worden';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_block_escalation_trg on public.profiles;
create trigger profiles_block_escalation_trg
  before update on public.profiles
  for each row execute function public.profiles_block_escalation();

-- ---------- #2: abonnementen + facturen — RLS (financiële data lekt cross-tenant) ----------
do $$
begin
  if to_regclass('public.abonnementen') is not null then
    execute 'alter table public.abonnementen enable row level security';
    execute 'drop policy if exists "Eigen tenant abonnement lezen" on public.abonnementen';
    execute 'create policy "Eigen tenant abonnement lezen" on public.abonnementen for select
             using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()))';
  end if;
  if to_regclass('public.facturen') is not null then
    execute 'alter table public.facturen enable row level security';
    execute 'drop policy if exists "Eigen tenant facturen lezen" on public.facturen';
    execute 'create policy "Eigen tenant facturen lezen" on public.facturen for select
             using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()))';
  end if;
end $$;

-- ---------- #13: aanvragen — RLS (kandidaat-PII lekt cross-tenant) ----------
do $$
begin
  if to_regclass('public.aanvragen') is not null then
    execute 'alter table public.aanvragen enable row level security';
    execute 'drop policy if exists "Eigen tenant aanvragen" on public.aanvragen';
    execute 'create policy "Eigen tenant aanvragen" on public.aanvragen for all
             using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()))
             with check (tenant_id in (select tenant_id from public.profiles where id = auth.uid()))';
  end if;
end $$;

-- ---------- #14: perf_metrics — RLS (tenant_id/user_id/route lekt) ----------
-- Alleen via service-role (admin-client) te lezen/schrijven; geen authenticated-policy.
do $$
begin
  if to_regclass('public.perf_metrics') is not null then
    execute 'alter table public.perf_metrics enable row level security';
    execute 'revoke all on public.perf_metrics from authenticated';
  end if;
end $$;

-- ---------- #6: Stripe-webhook idempotentie ----------
-- Houdt verwerkte Stripe-event-ids bij zodat een herbezorgd event (Stripe levert
-- at-least-once) niet opnieuw wachtwoorden reset / mails verstuurt.
create table if not exists public.stripe_webhook_events (
  event_id   text primary key,
  type       text,
  created_at timestamptz not null default now()
);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from authenticated;

-- ---------- #11: notificaties — UPDATE-policy mist WITH CHECK ----------
-- Zonder WITH CHECK kon een gebruiker een notificatie aan een ander toewijzen.
drop policy if exists "Notificaties eigen markeer gelezen" on public.notificaties;
create policy "Notificaties eigen markeer gelezen"
  on public.notificaties for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
