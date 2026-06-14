-- 081_mail_fulltext.sql
-- Fulltext search over mail_berichten via een gegenereerde tsvector-kolom.
-- search_doc combineert onderwerp (gewicht A), van (B) en tekst (C) zodat
-- treffers in het onderwerp hoger ranken dan in de body. De kolom is STORED
-- en wordt automatisch bijgewerkt bij elke INSERT/UPDATE van de bronkolommen.

alter table public.mail_berichten
  add column if not exists search_doc tsvector
  generated always as (
    setweight(to_tsvector('dutch', coalesce(onderwerp, '')), 'A') ||
    setweight(to_tsvector('dutch', coalesce(van, '')), 'B') ||
    setweight(to_tsvector('dutch', coalesce(tekst, '')), 'C')
  ) stored;

create index if not exists idx_mail_search
  on public.mail_berichten using gin (search_doc);
