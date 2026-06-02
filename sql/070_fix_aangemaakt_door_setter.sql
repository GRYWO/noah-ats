-- 070: Fix verkeerde aangemaakt_door — als die naar een setter wijst, op null zetten
-- SQL 069 backfilde aangemaakt_door = eigenaar_id, maar voor kandidaten waar
-- de eigenaar al een setter was, wijst aangemaakt_door nu naar een setter
-- (terwijl het de recruiter zou moeten zijn). Daardoor ging het verwijder-
-- verzoek naar de setter zelf. Hier fixen we dat.

update public.kandidaten k
   set aangemaakt_door = null
  from public.profiles p
 where k.aangemaakt_door = p.id
   and p.rol = 'setter';
