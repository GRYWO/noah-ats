-- Migration 076: rebrand handelsnaam GRYWO -> Noah recruitment
-- Wijzigt alleen tekst-velden in de tenants tabel.
-- Behoudt is_grywo_pool kolom als legacy-naam (geen DDL nodig).
-- Behoudt @grywo.nl email-adressen (email-domein migratie komt apart).
-- Behoudt Binqie B.V. als juridische entiteit waar van toepassing.
--
-- Draait in transactie zodat partiele faal volledige rollback geeft.
-- Idempotent: kan meermaals draaien zonder dubbele wijziging.

begin;

-- 1. Hoofdrename: tenant "GRYWO" naar "Noah recruitment"
update public.tenants
set naam = 'Noah recruitment'
where lower(naam) = 'grywo';

-- 2. Handelsnaam (als die kolom bestaat)
update public.tenants
set handelsnaam = 'Noah recruitment'
where lower(handelsnaam) = 'grywo';

-- 3. user_agreements: bureau_naam updaten waar gerefereerd naar GRYWO
update public.user_agreements
set bureau_naam = 'Noah recruitment'
where lower(bureau_naam) = 'grywo';

commit;

-- ============================================================
-- ROLLBACK script (alleen draaien als migratie mist of corrupt):
-- begin;
-- update public.tenants set naam = 'GRYWO' where naam = 'Noah recruitment';
-- update public.tenants set handelsnaam = 'GRYWO' where handelsnaam = 'Noah recruitment';
-- update public.user_agreements set bureau_naam = 'GRYWO' where bureau_naam = 'Noah recruitment';
-- commit;
