-- ===========================================
-- Mail storage tables — synced uit IMAP naar Supabase
-- Run in Supabase SQL Editor
-- ===========================================

-- Mappen per user (Inbox, Sent, etc.)
create table public.mail_mappen (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  pad         text not null,
  label       text not null,
  type        text not null default 'ander',
  aantal      int default 0,
  ongelezen   int default 0,
  last_sync   timestamptz,
  created_at  timestamptz default now(),
  unique (user_id, pad)
);

create index on public.mail_mappen (user_id);

-- Mail-berichten (per user, alle mappen)
create table public.mail_berichten (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  map_pad     text not null,
  uid         int not null,
  van         text,
  naam        text,
  naar        text,
  onderwerp   text,
  datum       timestamptz,
  gelezen     boolean default false,
  gevlagd     boolean default false,
  preview     text,
  -- Body: alleen geladen als mail geopend wordt
  html        text,
  tekst       text,
  body_loaded boolean default false,
  created_at  timestamptz default now(),
  unique (user_id, map_pad, uid)
);

create index on public.mail_berichten (user_id, map_pad);
create index on public.mail_berichten (user_id, datum desc);
create index on public.mail_berichten (user_id, gelezen);

-- RLS
alter table public.mail_mappen   enable row level security;
alter table public.mail_berichten enable row level security;

create policy "Eigen mappen lezen"   on public.mail_mappen   for select using (user_id = auth.uid());
create policy "Eigen mappen update"  on public.mail_mappen   for update using (user_id = auth.uid());
create policy "Eigen mappen delete"  on public.mail_mappen   for delete using (user_id = auth.uid());
create policy "Eigen mappen insert"  on public.mail_mappen   for insert with check (user_id = auth.uid());

create policy "Eigen mail lezen"     on public.mail_berichten for select using (user_id = auth.uid());
create policy "Eigen mail update"    on public.mail_berichten for update using (user_id = auth.uid());
create policy "Eigen mail delete"    on public.mail_berichten for delete using (user_id = auth.uid());
create policy "Eigen mail insert"    on public.mail_berichten for insert with check (user_id = auth.uid());
