-- Avatar upload + user voorkeuren

-- 1. avatar_url kolom op profiles
alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Publieke URL naar avatar in storage bucket "avatars". Null = initialen tonen.';

-- 2. Storage bucket voor avatars (publiek leesbaar, alleen owner kan uploaden)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB max
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Storage RLS: iedereen mag lezen (publiek), alleen ingelogde user mag in eigen folder schrijven
drop policy if exists "Avatars zijn publiek leesbaar" on storage.objects;
create policy "Avatars zijn publiek leesbaar"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users uploaden eigen avatar" on storage.objects;
create policy "Users uploaden eigen avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users updaten eigen avatar" on storage.objects;
create policy "Users updaten eigen avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users verwijderen eigen avatar" on storage.objects;
create policy "Users verwijderen eigen avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
