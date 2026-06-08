-- 074: Fix kandidaten die in 'in_wachtrij' staan maar al een eigenaar (setter) hebben
-- Door eerdere handmatige toewijzingen werd alleen eigenaar_id gezet, niet
-- kanban_stap. Resultaat: kanban toont ze nog in de wachtrij-kolom terwijl
-- ze al bij een setter horen. Hier corrigeren we de bestaande data.

update public.kandidaten k
   set kanban_stap = 'bij_setter'
  from public.profiles p
 where k.eigenaar_id = p.id
   and p.rol = 'setter'
   and k.kanban_stap in ('in_wachtrij', 'in_afwachting_cv');
