-- ===========================================
-- Meerdere mailadressen per user
-- Run in Supabase SQL Editor
-- ===========================================

create table public.mail_accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  mail_adres      text not null,
  mail_wachtwoord text,                    -- AES-versleuteld
  display_naam    text,                    -- "Yorith | GRYWO"
  handtekening_html text,
  is_primary      boolean default false,
  imap_host       text default 'imap.hostnet.nl',
  imap_port       int default 993,
  smtp_host       text default 'smtp.hostnet.nl',
  smtp_port       int default 587,
  mail_status     text default 'actief',   -- actief / fout / niet_geconfigureerd
  created_at      timestamptz default now(),
  unique (user_id, mail_adres)
);

create index on public.mail_accounts (user_id);
create index on public.mail_accounts (user_id, is_primary);

-- Voeg account_id toe aan mail_berichten + mail_mappen
alter table public.mail_berichten
  add column if not exists account_id uuid references public.mail_accounts(id) on delete cascade;

alter table public.mail_mappen
  add column if not exists account_id uuid references public.mail_accounts(id) on delete cascade;

create index if not exists mail_berichten_account_idx on public.mail_berichten (account_id);
create index if not exists mail_mappen_account_idx on public.mail_mappen (account_id);

-- RLS
alter table public.mail_accounts enable row level security;

create policy "Eigen mail-accounts lezen"  on public.mail_accounts for select  using (user_id = auth.uid());
create policy "Eigen mail-accounts insert" on public.mail_accounts for insert  with check (user_id = auth.uid());
create policy "Eigen mail-accounts update" on public.mail_accounts for update  using (user_id = auth.uid());
create policy "Eigen mail-accounts delete" on public.mail_accounts for delete  using (user_id = auth.uid());

-- Realtime push
alter publication supabase_realtime add table public.mail_accounts;

-- Migrate bestaande mail-config uit profiles naar mail_accounts
insert into public.mail_accounts (user_id, mail_adres, mail_wachtwoord, display_naam, handtekening_html, is_primary, mail_status)
select
  id,
  mail_adres,
  mail_wachtwoord,
  coalesce(voornaam || ' ' || achternaam, mail_adres),
  handtekening_html,
  true,
  coalesce(mail_status, 'actief')
from public.profiles
where mail_adres is not null
on conflict (user_id, mail_adres) do nothing;

-- Migrate bestaande mail_berichten + mail_mappen naar account_id (alleen primair)
update public.mail_berichten mb
set account_id = ma.id
from public.mail_accounts ma
where mb.user_id = ma.user_id
  and ma.is_primary = true
  and mb.account_id is null;

update public.mail_mappen mm
set account_id = ma.id
from public.mail_accounts ma
where mm.user_id = ma.user_id
  and ma.is_primary = true
  and mm.account_id is null;
