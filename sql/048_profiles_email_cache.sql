-- Performance-fix: email opslaan in profiles zodat /setters niet meer
-- auth.admin.listUsers({perPage:200}) per request hoeft te doen.
alter table public.profiles
  add column if not exists email text;

create index if not exists idx_profiles_email on public.profiles(email);

-- Eenmalig huidige emails uit auth.users kopiëren naar profiles.email
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or p.email = '');

-- Trigger: bij nieuwe of bijgewerkte auth.users sync de email naar profiles
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists trg_sync_profile_email on auth.users;
create trigger trg_sync_profile_email
  after insert or update of email on auth.users
  for each row
  execute function public.sync_profile_email();

comment on column public.profiles.email is
  'Denormalized cache van auth.users.email — automatisch gesynced via trigger. Voorkomt dure listUsers() calls in /setters.';
