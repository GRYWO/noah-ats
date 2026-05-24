-- ===========================================
-- Fix: Admins / setters / recruiters mogen
-- elkaar zien (binnen eigen tenant)
-- Run in Supabase SQL Editor
-- ===========================================

-- Helper functie die buiten RLS draait (anders krijg je een loop)
create or replace function public.my_tenant_id()
returns uuid
language sql
security definer
stable
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- Oude policy weg
drop policy if exists "Eigen profile lezen" on public.profiles;

-- Nieuwe policy: alle profiles van eigen tenant zichtbaar
create policy "Profiles eigen tenant lezen"
  on public.profiles for select
  using (tenant_id = public.my_tenant_id());
