-- ===========================================
-- Performance-indexen voor de hot query-paden (veilig: if not exists)
-- Run in Supabase SQL Editor. Helpt vooral bij groei naar veel setters/kandidaten.
-- ===========================================

-- Kanban filtert kandidaten op eigenaar; dashboard op vacature; talentpool op stap.
create index if not exists kandidaten_eigenaar_idx on public.kandidaten (eigenaar_id);
create index if not exists kandidaten_vacature_idx on public.kandidaten (vacature_id);
create index if not exists kandidaten_kanban_idx   on public.kandidaten (kanban_stap);
create index if not exists kandidaten_tenant_idx   on public.kandidaten (tenant_id);

-- "Te claimen" + publieke lijst filteren op status.
create index if not exists rec_vacatures_status_idx on public.rec_vacatures (status);

-- Dubbele-plaatsing-check zoekt op kandidaat_id.
create index if not exists plaatsingen_kandidaat_idx on public.plaatsingen (kandidaat_id);

-- De zoekbot pollt op status + type.
create index if not exists zoek_jobs_status_type_idx on public.zoek_jobs (status, type);
