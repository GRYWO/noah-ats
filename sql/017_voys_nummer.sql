-- ===========================================
-- Optioneel Voys/eigen toestel-nummer per user
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.profiles
  add column if not exists voys_nummer text;

comment on column public.profiles.voys_nummer is 'Eigen Voys-toestelnummer voor click-to-dial. Indien leeg wordt profile.telefoon gebruikt.';
