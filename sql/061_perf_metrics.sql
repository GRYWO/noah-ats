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

-- Mailboxen: ongelezen count per account_id
create index if not exists idx_mailboxen_account on public.mailboxen (account_id);

-- Profiles: setter-leaderboard filtert op rol + tenant
create index if not exists idx_profiles_rol_tenant on public.profiles (rol, tenant_id);

-- Plaatsingen: dashboard telt per setter binnen periode
create index if not exists idx_plaatsingen_setter_datum
  on public.plaatsingen (setter_id, geplaatst_op desc);

-- Notificaties: per user, gesorteerd op aangemaakt
create index if not exists idx_bericht_threads_user_tijd
  on public.bericht_threads (user_id, aangemaakt_op desc);

-- EOD: per setter per dag (admin overzicht)
create index if not exists idx_eod_setter_dag on public.eod_rapporten (setter_id, datum desc);

comment on table public.perf_metrics is
  'Latency-log per pageload. Alleen super-admin leest. 30 dagen bewaard.';
