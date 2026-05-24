-- ===========================================
-- MAIL TEMPLATES (super-admin only, globaal)
-- Run in Supabase SQL Editor
-- ===========================================

create table if not exists public.mail_templates (
  sleutel              text primary key,
  body_html            text not null,
  laatst_gewijzigd     timestamptz default now(),
  laatst_gewijzigd_door uuid references public.profiles(id) on delete set null
);

alter table public.mail_templates enable row level security;

-- Niemand kan via RLS lezen/schrijven; we gebruiken altijd admin-client
-- (super-admin check gebeurt in de server action)
create policy "Geen client-access mail_templates"
  on public.mail_templates for select
  using (false);
