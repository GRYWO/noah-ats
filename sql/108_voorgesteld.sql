-- ===========================================
-- "Stel voor": wanneer een kandidaat naar de contactpersoon is gemaild.
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.bellijst_items
  add column if not exists voorgesteld_at timestamptz;
