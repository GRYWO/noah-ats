-- Document-ondertekenings-systeem (rechtsgeldig eIDAS SES)
-- Alleen super-admin (Yorith) maakt envelopes aan en stuurt naar ondertekenaars

create table if not exists public.document_envelopes (
  id uuid primary key default gen_random_uuid(),
  titel text not null,
  beschrijving text,
  pdf_pad text not null,                       -- storage path naar origineel
  voltooid_pdf_pad text,                       -- storage path naar getekend resultaat
  aangemaakt_door uuid references public.profiles(id) on delete set null,
  status text not null default 'verzonden'
    check (status in ('verzonden','deels_getekend','voltooid','vervallen','ingetrokken')),
  vervalt_op timestamptz not null default (now() + interval '30 days'),
  voltooid_op timestamptz,
  aangemaakt_op timestamptz not null default now()
);

create table if not exists public.document_ondertekenaars (
  id uuid primary key default gen_random_uuid(),
  envelope_id uuid not null references public.document_envelopes(id) on delete cascade,
  voornaam text not null,
  achternaam text not null,
  email text not null,
  token text not null unique,
  volgorde int not null default 0,             -- voor toekomst sequentieel
  status text not null default 'wachtend'
    check (status in ('wachtend','getekend','geweigerd')),

  -- Handtekening data
  handtekening_type text check (handtekening_type in ('getypt','getekend')),
  handtekening_naam text,                       -- bij getypt
  handtekening_data text,                       -- bij getekend: base64 PNG

  -- Audit (eIDAS SES)
  getekend_op timestamptz,
  ip_adres text,
  user_agent text,

  -- Reminders
  laatste_reminder_op timestamptz,
  aantal_reminders int not null default 0,

  aangemaakt_op timestamptz not null default now()
);

create index if not exists idx_envelopes_status on public.document_envelopes(status);
create index if not exists idx_envelopes_door on public.document_envelopes(aangemaakt_door);
create index if not exists idx_ondertekenaars_envelope on public.document_ondertekenaars(envelope_id);
create index if not exists idx_ondertekenaars_token on public.document_ondertekenaars(token);
create index if not exists idx_ondertekenaars_status on public.document_ondertekenaars(status);

-- Storage bucket voor documenten (privé)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documenten','documenten', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- RLS — alleen super-admin via admin-client. Tabellen ZONDER RLS-enabling
-- omdat we strikt admin-client gebruiken voor schrijven en token-based
-- voor ondertekenaars-acties.

comment on table public.document_envelopes is
  'Documenten die door super-admin worden verstuurd voor ondertekening. '
  'Eén envelope kan meerdere ondertekenaars hebben (parallel).';
comment on table public.document_ondertekenaars is
  'Individuele ondertekenaars per envelope. Token-based publieke tekenflow. '
  'eIDAS SES audit-trail: IP + UA + tijdstip + handtekening-data.';
