-- Snippets/templates voor mail-compose. Korte stukjes tekst die je
-- regelmatig hergebruikt, optioneel met sneltoets.

CREATE TABLE IF NOT EXISTS mail_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naam text NOT NULL,
  tekst text NOT NULL,
  sneltoets text,
  gemaakt_op timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_snippets_user ON mail_snippets(user_id);

ALTER TABLE mail_snippets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "eigen snippets lezen" ON mail_snippets
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eigen snippets schrijven" ON mail_snippets
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eigen snippets bijwerken" ON mail_snippets
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eigen snippets verwijderen" ON mail_snippets
    FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unieke naam per user voorkomt dubbele snippets met dezelfde naam.
-- Idempotent: alleen toevoegen als constraint nog niet bestaat.
DO $$ BEGIN
  ALTER TABLE mail_snippets
    ADD CONSTRAINT mail_snippets_user_naam_uniek UNIQUE (user_id, naam) DEFERRABLE INITIALLY IMMEDIATE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
