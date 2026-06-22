-- ===========================================
-- Voorstel-status per kandidaat voor de pijplijn:
-- voorgesteld -> gezien -> op_gesprek / afgewezen
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.kandidaten
  add column if not exists voorstel_status   text,        -- voorgesteld | gezien | op_gesprek | afgewezen
  add column if not exists voorstel_gezien_at timestamptz;
