-- 059: vlag voor intern GRYWO/Noah personeel.
-- Admin's met deze vlag krijgen de volledige AdminDashboard i.p.v. BureauAdminDashboard.
-- Onafhankelijk van kan_abonnementen_beheren (Pepijn heeft beide, Wouter alleen deze).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_intern_personeel boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.is_intern_personeel IS
  'Intern Noah/GRYWO personeel. Admin met deze vlag ziet volledige admin-dashboard i.p.v. bureau-view.';
