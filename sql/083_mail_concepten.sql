-- Mail-concepten: auto-save voor de compose-form. Eén user kan meerdere
-- concepten hebben, maar in de praktijk gebruiken we er meestal één per
-- compose-sessie. RLS strikt op user_id.

CREATE TABLE IF NOT EXISTS mail_concepten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naar text DEFAULT '',
  onderwerp text DEFAULT '',
  tekst text DEFAULT '',
  bijgewerkt_op timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mail_concepten_user ON mail_concepten(user_id, bijgewerkt_op DESC);

ALTER TABLE mail_concepten ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "eigen concepten lezen" ON mail_concepten
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eigen concepten schrijven" ON mail_concepten
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eigen concepten bijwerken" ON mail_concepten
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "eigen concepten verwijderen" ON mail_concepten
    FOR DELETE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
