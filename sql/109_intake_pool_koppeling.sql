-- ===========================================
-- Robin-kandidaat -> volledige kandidaat (intake) + pool per vacature
-- Run in Supabase SQL Editor
-- ===========================================

-- Koppel de aangemaakte kandidaat terug aan het bellijst-item.
alter table public.bellijst_items
  add column if not exists kandidaat_id uuid;

-- Pool per vacature + herkomst van de kandidaat.
alter table public.kandidaten
  add column if not exists vacature_id           uuid,
  add column if not exists bron_bellijst_item_id uuid;
