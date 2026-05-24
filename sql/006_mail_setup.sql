-- ===========================================
-- Mail-setup per user
-- Run in Supabase SQL Editor
-- ===========================================

alter table public.profiles
  add column if not exists mail_adres        text,
  add column if not exists mail_wachtwoord   text, -- versleuteld (AES-256)
  add column if not exists handtekening_html text,
  add column if not exists mail_status       text default 'niet_geconfigureerd';
  -- niet_geconfigureerd / actief / fout
