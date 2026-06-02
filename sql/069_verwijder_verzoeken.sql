-- 069: Verwijder-verzoeken voor kandidaten (setter → recruiter goedkeuring)
-- Setters mogen geen kandidaten meer rechtstreeks verwijderen.
-- In plaats daarvan dienen ze een verzoek in dat per mail naar de recruiter
-- (degene die de kandidaat aangemaakt heeft) gaat. Recruiter klikt op
-- 'Akkoord' in de mail (token-based) en dan wordt de kandidaat verwijderd.

-- Track wie de kandidaat heeft aangemaakt (nodig om verzoek te routen)
alter table public.kandidaten
  add column if not exists aangemaakt_door uuid references public.profiles(id) on delete set null;

create index if not exists idx_kandidaten_aangemaakt_door
  on public.kandidaten (aangemaakt_door);

-- Backfill: voor bestaande kandidaten zonder aangemaakt_door, gebruik eigenaar_id.
-- Niet perfect maar voorkomt dat oude kandidaten in een nieuw verzoek vastlopen.
update public.kandidaten
   set aangemaakt_door = eigenaar_id
 where aangemaakt_door is null
   and eigenaar_id is not null;

-- Verzoek-tabel
create table if not exists public.kandidaat_verwijder_verzoeken (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  kandidaat_id      uuid not null references public.kandidaten(id) on delete cascade,
  aangevraagd_door  uuid not null references public.profiles(id) on delete cascade,
  goedkeurder_id    uuid references public.profiles(id) on delete set null,
  token             text not null unique,
  status            text not null default 'open',
    -- 'open' / 'goedgekeurd' / 'geweigerd' / 'verlopen'
  reden_aanvraag    text,
  aangevraagd_op    timestamptz not null default now(),
  behandeld_op      timestamptz,
  verloopt_op       timestamptz not null default (now() + interval '14 days')
);

create index if not exists idx_kand_verwijder_status
  on public.kandidaat_verwijder_verzoeken (status, kandidaat_id);
create index if not exists idx_kand_verwijder_token
  on public.kandidaat_verwijder_verzoeken (token);

alter table public.kandidaat_verwijder_verzoeken enable row level security;

comment on table public.kandidaat_verwijder_verzoeken is
  'Verzoeken van setters om een kandidaat te verwijderen. Recruiter keurt goed via token-link in mail.';
