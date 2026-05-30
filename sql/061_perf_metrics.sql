-- 061: Performance metrics — latency tracking voor super-admin dashboard.
-- We loggen per page/route hoe lang het server-side render duurde.
-- Geen RLS — alleen super-admin (Yorith) leest dit via admin client.

create table if not exists public.perf_metrics (
  id           bigserial primary key,
  pad          text not null,           -- bv. "/dashboard" of "/api/kandidaten"
  type         text not null,           -- "page" | "api" | "query" | "rsc"
  duur_ms      integer not null,
  user_id      uuid,                    -- null als publieke route
  tenant_id    uuid,
  status       smallint,                -- HTTP status (alleen voor API)
  extra        jsonb,                   -- vrije ruimte voor breakdowns
  occurred_at  timestamptz not null default now()
);

-- Indexes om de admin-dashboard queries snel te houden
create index if not exists idx_perf_path on public.perf_metrics (pad);
create index if not exists idx_perf_time on public.perf_metrics (occurred_at desc);
create index if not exists idx_perf_type_time on public.perf_metrics (type, occurred_at desc);
create index if not exists idx_perf_slow on public.perf_metrics (duur_ms desc) where duur_ms >= 200;

-- Bewaartermijn: 30 dagen automatisch opruimen via cleanup-avg cron
-- (we voegen straks de delete toe aan die cron)

-- ============================================================
-- Ontbrekende indexes voor de zwaarste queries in de codebase
-- ============================================================

-- Kandidaten: filter veel op tenant + status + eigenaar
create index if not exists idx_kandidaten_tenant_status on public.kandidaten (tenant_id, status);
create index if not exists idx_kandidaten_eigenaar_status on public.kandidaten (eigenaar_id, status) where eigenaar_id is not null;
create index if not exists idx_kandidaten_status_plaatsing on public.kandidaten (status, plaatsing_mail_sent) where status = 'geplaatst';

-- Voorstellen: dashboard telt per setter/periode
create index if not exists idx_voorstellen_setter_verzonden on public.voorstellen (setter_id, verzonden_op desc);
create index if not exists idx_voorstellen_status on public.voorstellen (status);

-- Mail-berichten: inbox-lijst sorteert op datum desc per account
create index if not exists idx_mail_berichten_account_datum
  on public.mail_berichten (account_id, datum desc nulls last);

-- Mail-mappen: ongelezen count per account_id
create index if not exists idx_mail_mappen_account on public.mail_mappen (account_id);

-- Profiles: setter-leaderboard filtert op rol + tenant
create index if not exists idx_profiles_rol_tenant on public.profiles (rol, tenant_id);

-- Plaatsingen: dashboard telt per aangemelde user binnen periode
create index if not exists idx_plaatsingen_aangemeld_datum
  on public.plaatsingen (aangemeld_door, created_at desc);

-- (geen extra index op notificaties — bestaande indexes uit 023_notificaties.sql dekken alles)

-- EOD: index op (setter_id, rapport_datum desc) bestaat al uit 037_coaching.sql,
-- dus we voegen hier alleen een extra voor tenant-brede admin queries toe.
create index if not exists idx_eod_tenant_datum on public.eod_rapporten (tenant_id, rapport_datum desc);

comment on table public.perf_metrics is
  'Latency-log per pageload. Alleen super-admin leest. 30 dagen bewaard.';
