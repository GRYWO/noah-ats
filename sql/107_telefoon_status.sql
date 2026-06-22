-- ===========================================
-- Telefoon-status per kandidaat: weten of onthullen al geprobeerd is.
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.bellijst_items
  add column if not exists telefoon_status text,   -- null | 'gevonden' | 'niet_beschikbaar'
  add column if not exists email           text;   -- onthuld e-mailadres (indien beschikbaar)
