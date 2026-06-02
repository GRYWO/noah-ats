-- 068: Reset menu_permissions voor users met all-false vanwege bug
-- Bij user-aanmaak werd menu_permissions per ongeluk op { alle:false } gezet
-- omdat de checkbox-UI eerder verwijderd was maar de server-action nog steeds
-- elke key op 'false' zette als de checkbox afwezig was.
-- Resultaat: hun sidebar was helemaal leeg.
-- Reset alle profiles waar geen enkele permission true is naar null.

update public.profiles
   set menu_permissions = null
 where menu_permissions is not null
   and not exists (
     select 1
       from jsonb_each(menu_permissions::jsonb) as kv(key, val)
      where (val::text)::boolean = true
   );
