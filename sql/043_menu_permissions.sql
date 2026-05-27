-- Per-user menu-permissions: jsonb met booleans per menu-key.
-- NULL = backwards compat (alles aan op basis van rol).
-- Voorbeeld: {"dashboard": true, "kandidaten": true, "kanban": false, ...}
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS menu_permissions jsonb DEFAULT NULL;

COMMENT ON COLUMN profiles.menu_permissions IS
  'Per-user override van welke menu-items zichtbaar zijn. NULL = standaard op rol. Alleen super-admin (Yorith) mag dit zetten.';
