-- Per-bureau huisstijl (white-label) — alleen instelbaar door Yorith
alter table public.tenants
  add column if not exists huisstijl_logo_url   text,
  add column if not exists huisstijl_primair    text default '#333399',
  add column if not exists huisstijl_accent     text default '#ffd84d',
  add column if not exists huisstijl_actief     boolean not null default false;

comment on column public.tenants.huisstijl_logo_url is
  'Publieke URL naar bureau-logo (PNG/SVG). Wordt getoond in sidebar + mail.';
comment on column public.tenants.huisstijl_primair is
  'Hoofdkleur hex (#RRGGBB) — vervangt #333399 als huisstijl_actief.';
comment on column public.tenants.huisstijl_accent is
  'Accent-kleur hex — vervangt #ffd84d als huisstijl_actief.';
comment on column public.tenants.huisstijl_actief is
  'Master-switch: alleen als true wordt de huisstijl toegepast.';

-- Storage bucket voor bureau-logos (publiek leesbaar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bureau-logos',
  'bureau-logos',
  true,
  2097152, -- 2MB
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do nothing;

-- Iedereen mag logos lezen (publiek)
drop policy if exists "Bureau-logos publiek leesbaar" on storage.objects;
create policy "Bureau-logos publiek leesbaar"
  on storage.objects for select
  using (bucket_id = 'bureau-logos');

-- Schrijven gaat via admin-client (server actions) — geen direct upload
