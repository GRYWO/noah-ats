-- 072: Een kandidaat mag maar 1x naar dezelfde opdrachtgever worden voorgesteld
-- Dubbel-vangnet bovenop de check in voorstel-actions.ts: op DB-niveau
-- afdwingen dat (kandidaat_id, opdrachtgever_email) uniek is wanneer beide
-- gevuld zijn. Voorkomt spam-mails naar zelfde contactpersoon.

-- Stap 1: bestaande duplicaten opruimen — bewaar de OUDSTE per combinatie
-- (kandidaat_id, opdrachtgever_email) en verwijder de rest. De oudste bevat
-- waarschijnlijk de echte reactie/kennismaking-data.
with rangschik as (
  select id,
         row_number() over (
           partition by kandidaat_id, lower(opdrachtgever_email)
           order by created_at asc
         ) as rij
    from public.voorstellen
   where opdrachtgever_email is not null
     and kandidaat_id is not null
)
delete from public.voorstellen
 where id in (select id from rangschik where rij > 1);

-- Stap 2: unieke partial index (zonder NULL-collisions)
create unique index if not exists uniek_voorstel_per_opdrachtgever
  on public.voorstellen (kandidaat_id, lower(opdrachtgever_email))
  where opdrachtgever_email is not null and kandidaat_id is not null;
