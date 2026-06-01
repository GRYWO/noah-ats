-- 065: Device-beveiliging + inactiviteits-uitlog
-- Eén user mag maar op 1 apparaat tegelijk ingelogd zijn.
-- Token wordt bij elke login vernieuwd; middleware vergelijkt cookie met DB.

alter table public.profiles
  add column if not exists actieve_device_token text;

comment on column public.profiles.actieve_device_token is
  'Random token gegenereerd bij login. Cookie noah_device moet matchen, '
  'anders wordt user uitgelogd (single-device-policy).';
