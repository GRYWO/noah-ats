-- Voegt de kolom 'salaris_indicatie' toe aan rec_kandidaten zodat de
-- gewenste salaris-indicatie uit de website-intake (noah-recruitment) bewaard
-- blijft op de website-kandidaat-rij. De spiegel-rij in kandidaten heeft deze
-- kolom al; dit gelijktrekt de twee tabellen.
ALTER TABLE rec_kandidaten ADD COLUMN IF NOT EXISTS salaris_indicatie text;
