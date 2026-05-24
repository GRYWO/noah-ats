-- ===========================================
-- Realtime push activeren op mail_berichten + mail_mappen
-- Run in Supabase SQL Editor
-- ===========================================

-- Voeg tabellen toe aan supabase_realtime publication
-- (Supabase Realtime broadcast dan INSERTS/UPDATES naar abonnees)

alter publication supabase_realtime add table public.mail_berichten;
alter publication supabase_realtime add table public.mail_mappen;
