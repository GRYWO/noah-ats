-- Performance-indexen voor 10 bureaus + 100+ setters.
-- Concurrent waar mogelijk (geen tabel-lock).

-- Kandidaten — meest gequeryde tabel
create index if not exists idx_kandidaten_tenant_id      on public.kandidaten(tenant_id);
create index if not exists idx_kandidaten_eigenaar_id    on public.kandidaten(eigenaar_id);
create index if not exists idx_kandidaten_status         on public.kandidaten(status);
create index if not exists idx_kandidaten_kanban_stap    on public.kandidaten(kanban_stap);
create index if not exists idx_kandidaten_created_at     on public.kandidaten(created_at desc);
create index if not exists idx_kandidaten_updated_at     on public.kandidaten(updated_at desc);
create index if not exists idx_kandidaten_email          on public.kandidaten(email) where email is not null;
-- Composite voor de meest voorkomende query: kandidaten van een bureau in een specifieke stap
create index if not exists idx_kandidaten_tenant_kanban  on public.kandidaten(tenant_id, kanban_stap);
create index if not exists idx_kandidaten_tenant_eigenaar on public.kandidaten(tenant_id, eigenaar_id);

-- Profiles
create index if not exists idx_profiles_tenant_id        on public.profiles(tenant_id);
create index if not exists idx_profiles_rol              on public.profiles(rol);
create index if not exists idx_profiles_is_active        on public.profiles(is_active) where is_active = true;

-- Voorstellen
create index if not exists idx_voorstellen_kandidaat_id  on public.voorstellen(kandidaat_id);
create index if not exists idx_voorstellen_tenant_id     on public.voorstellen(tenant_id);
create index if not exists idx_voorstellen_status        on public.voorstellen(status);
create index if not exists idx_voorstellen_created_at    on public.voorstellen(created_at desc);

-- Voorstel-logs — vaak voor 1 kandidaat oplopend in tijd
create index if not exists idx_logs_kandidaat_created    on public.voorstel_logs(kandidaat_id, created_at desc);
create index if not exists idx_logs_tenant_created       on public.voorstel_logs(tenant_id, created_at desc);

-- Agenda-events
create index if not exists idx_agenda_setter_id          on public.agenda_events(setter_id);
create index if not exists idx_agenda_kandidaat_id       on public.agenda_events(kandidaat_id);
create index if not exists idx_agenda_start_at           on public.agenda_events(start_at);

-- Plaatsingen
create index if not exists idx_plaatsingen_tenant_id     on public.plaatsingen(tenant_id);
create index if not exists idx_plaatsingen_aangemeld_door on public.plaatsingen(aangemeld_door);
create index if not exists idx_plaatsingen_created_at    on public.plaatsingen(created_at desc);

-- EOD-rapporten — leaderboard query is zwaar
create index if not exists idx_eod_setter_datum          on public.eod_rapporten(setter_id, rapport_datum desc);
create index if not exists idx_eod_tenant_datum          on public.eod_rapporten(tenant_id, rapport_datum desc);

-- Wachtend op CV
create index if not exists idx_wachtend_tenant_created   on public.wachtend_op_cv(tenant_id, created_at desc);

-- Statistics opnieuw bouwen zodat de query-planner de indexen gaat gebruiken
analyze public.kandidaten;
analyze public.profiles;
analyze public.voorstellen;
analyze public.voorstel_logs;
