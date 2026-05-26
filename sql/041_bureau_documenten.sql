-- ===========================================
-- Bureau documenten: contract, overeenkomst, ID-UBO, etc.
-- Super-admin upload, bureau-admin kan downloaden.
-- ===========================================

create table if not exists public.bureau_documenten (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete cascade,
  naam            text not null,
  bestand_pad     text not null,    -- pad in Supabase Storage bucket 'bureau-documenten'
  bestand_url     text,             -- public URL of signed URL
  type            text,             -- contract, overeenkomst, kvk, etc.
  geupload_door   uuid references public.profiles(id) on delete set null,
  created_at      timestamptz default now()
);

create index if not exists bureau_documenten_tenant_idx on public.bureau_documenten (tenant_id, created_at desc);

alter table public.bureau_documenten enable row level security;

-- Bureau-admin kan eigen documenten zien
create policy "Bureau documenten eigen tenant lezen"
  on public.bureau_documenten for select
  using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

-- Super-admin uploads gaan via service-role client; geen INSERT policy nodig.

-- Storage bucket aanmaken (alleen 1x nodig — runnen via Supabase Storage UI of:):
-- insert into storage.buckets (id, name, public) values ('bureau-documenten', 'bureau-documenten', false);
