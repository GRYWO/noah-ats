-- ===========================================
-- Multi-account: unique-constraint op mail_mappen verleggen van
-- (user_id, pad) naar (account_id, pad). Anders botsen twee mailboxen
-- van dezelfde user die allebei een 'INBOX' hebben en overschrijven
-- ze elkaars row bij sync. Matcht ook met onConflict in mail-sync.ts
-- en de upsert in inbox/actions.ts.
-- Run in Supabase SQL Editor (na 011_mail_accounts.sql).
-- ===========================================

-- 1. Backfill: zorg dat elke mail_mappen-row een account_id heeft, anders
--    kan de nieuwe unique-constraint niet aangelegd worden voor rows met
--    account_id is null. We koppelen ontbrekende rows aan het primaire
--    account van de user.
update public.mail_mappen mm
set account_id = ma.id
from public.mail_accounts ma
where mm.user_id = ma.user_id
  and ma.is_primary = true
  and mm.account_id is null;

-- 2. Mochten er nog rows zonder primary-account zijn: pak het oudste
--    actieve account van die user.
update public.mail_mappen mm
set account_id = ma.id
from (
  select distinct on (user_id) id, user_id
  from public.mail_accounts
  order by user_id, created_at asc
) ma
where mm.user_id = ma.user_id
  and mm.account_id is null;

-- 3. Verwijder rijen die nog steeds geen account hebben (er bestaat
--    geen mail_accounts voor die user) — die zijn obsolete.
delete from public.mail_mappen where account_id is null;

-- 4. Dedupliceer: hou per (account_id, pad) alleen de meest recente row.
delete from public.mail_mappen a
using public.mail_mappen b
where a.account_id = b.account_id
  and a.pad = b.pad
  and a.id < b.id;

-- 5. Vervang de oude unique-constraint.
alter table public.mail_mappen
  drop constraint if exists mail_mappen_user_id_pad_key;

alter table public.mail_mappen
  add constraint mail_mappen_account_id_pad_key unique (account_id, pad);

-- 6. account_id wordt nu verplicht — voorkomt nieuwe rows zonder
--    account_id die de unique-constraint zouden ondermijnen.
alter table public.mail_mappen
  alter column account_id set not null;
