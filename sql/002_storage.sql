-- ===========================================
-- STORAGE POLICIES voor CV bucket
-- Run dit in Supabase SQL Editor
-- ===========================================

-- Iedereen mag uploaden in z'n eigen tenant-map
create policy "CV upload in eigen tenant"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (
    select tenant_id::text from public.profiles where id = auth.uid()
  )
);

-- Iedereen mag CV's lezen van eigen tenant
create policy "CV lezen in eigen tenant"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (
    select tenant_id::text from public.profiles where id = auth.uid()
  )
);

-- Iedereen mag CV's verwijderen van eigen tenant
create policy "CV verwijderen in eigen tenant"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (
    select tenant_id::text from public.profiles where id = auth.uid()
  )
);

-- Iedereen mag CV's updaten van eigen tenant
create policy "CV updaten in eigen tenant"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (
    select tenant_id::text from public.profiles where id = auth.uid()
  )
);
