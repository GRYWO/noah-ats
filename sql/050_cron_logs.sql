-- Cron / bot logging — voor super-admin monitoring widget
create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  cron_naam text not null,           -- bv "cleanup-avg"
  status text not null,              -- "succes" | "fout" | "gedeeltelijk"
  duur_ms integer,                   -- runtime in ms
  resultaat jsonb,                   -- vrij detail-object
  fout_melding text,                 -- error message indien fout
  gestart_op timestamptz not null default now(),
  geeindigd_op timestamptz not null default now()
);

create index if not exists idx_cron_runs_naam_datum
  on public.cron_runs(cron_naam, gestart_op desc);
create index if not exists idx_cron_runs_status
  on public.cron_runs(status);

-- Alleen super-admin (Yorith) leest dit — via admin client. Geen RLS nodig
-- want we lezen het alleen vanuit server actions met service-role.
-- Tabel ZONDER RLS = niet toegankelijk via anon/auth, alleen via admin client.

comment on table public.cron_runs is
  'Audit log van alle cron/bot uitvoeringen. Gebruikt door /dashboard '
  '(BotsStatus widget) voor super-admin monitoring.';

-- Oude entries automatisch opruimen (>30 dagen) — door cleanup-avg cron
