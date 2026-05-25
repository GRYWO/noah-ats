-- ===========================================
-- Notificaties: threading via parent_notificatie_id
-- Zo kan een setter/recruiter reageren op een melding,
-- en blijft de gespreks-thread bewaard.
-- ===========================================

alter table public.notificaties
  add column if not exists parent_notificatie_id uuid
  references public.notificaties(id) on delete set null;

create index if not exists notificaties_parent_idx
  on public.notificaties (parent_notificatie_id);
