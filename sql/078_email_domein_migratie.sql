-- Migration 078: email-domein migratie @grywo.nl -> @noah-recruitment.nl
-- Update alle profielen + mail_accounts + auth.users naar nieuwe domein.
-- Idempotent met REPLACE: als al gemigreerd, doet niets.
-- Forwarders op grywo.nl handelen inkomende mail af, dus geen onderbreking.

begin;

-- 1. profiles tabel
update public.profiles
set mail_adres = replace(mail_adres, '@grywo.nl', '@noah-recruitment.nl')
where mail_adres ilike '%@grywo.nl';

-- 2. mail_accounts tabel
update public.mail_accounts
set mail_adres = replace(mail_adres, '@grywo.nl', '@noah-recruitment.nl')
where mail_adres ilike '%@grywo.nl';

-- 3. auth.users tabel (Supabase Auth) login-email wordt @noah-recruitment.nl
--    Doe dit alleen voor users wiens email op @grywo.nl staat.
update auth.users
set email = replace(email, '@grywo.nl', '@noah-recruitment.nl')
where email ilike '%@grywo.nl';

-- 4. mail_berichten cache opschonen voor oude grywo.nl accounts zodat
--    bij volgende sync vanuit de nieuwe noah-recruitment.nl mailbox
--    alles opnieuw kan worden geindexeerd. (Optioneel sync kan ook
--    delta doen.)
-- delete from public.mail_berichten where account_id in (
--   select id from public.mail_accounts where mail_adres ilike '%@noah-recruitment.nl'
-- );

commit;

-- ============================================================
-- ROLLBACK (alleen als nodig komt na de migratie terug naar grywo.nl):
-- begin;
-- update public.profiles set mail_adres = replace(mail_adres, '@noah-recruitment.nl', '@grywo.nl')
--   where mail_adres ilike '%@noah-recruitment.nl';
-- update public.mail_accounts set mail_adres = replace(mail_adres, '@noah-recruitment.nl', '@grywo.nl')
--   where mail_adres ilike '%@noah-recruitment.nl';
-- update auth.users set email = replace(email, '@noah-recruitment.nl', '@grywo.nl')
--   where email ilike '%@noah-recruitment.nl';
-- commit;
