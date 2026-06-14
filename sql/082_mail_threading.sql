-- 082_mail_threading.sql
-- Conversation threading: groepeer mails op een genormaliseerd thread_id.
-- We strippen Re:/Fwd:/Fw:/Aw: prefixes en lowercasen het onderwerp zodat
-- antwoorden in dezelfde thread vallen. Bij sync wordt waar mogelijk de
-- in-reply-to header gebruikt (zie mail-sync.ts).

alter table public.mail_berichten
  add column if not exists thread_id text;

create index if not exists idx_mail_thread
  on public.mail_berichten (user_id, thread_id, datum desc);

update public.mail_berichten
   set thread_id = regexp_replace(
         lower(coalesce(onderwerp, '(geen onderwerp)')),
         '^(re:|fwd:|fw:|aw:)\s*',
         '',
         'g'
       )
 where thread_id is null;
