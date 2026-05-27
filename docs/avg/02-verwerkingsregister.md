# Verwerkingsregister — GRYWO / Noah ATS

Conform AVG art. 30. Versie 1.0 — laatst bijgewerkt: 27 mei 2026.

## Verwerkingsverantwoordelijke

**OneTwoStart NL B.V.** (handelsnaam: GRYWO)
Raasdorperweg 191 A, 1175 KV Lijnden
KvK 96738782 · yorith@grywo.nl · 085-4016082

Functionaris Gegevensbescherming: _Niet aangewezen — niet verplicht (geen bijzondere categorieën op grote schaal)_

---

## Verwerking 1 — Werving & selectie kandidaten

| Veld | Inhoud |
|---|---|
| **Doel** | Kandidaten werven en koppelen aan opdrachtgevers van aangesloten bureaus |
| **Rechtsgrond** | Gerechtvaardigd belang (art. 6 lid 1 sub f AVG) — kandidaat heeft zich aangemeld of CV gestuurd |
| **Categorieën betrokkenen** | Kandidaten die door bureaus benaderd worden |
| **Categorieën gegevens** | NAW, e-mail, telefoon, geboortedatum, opleiding, CV, werkervaring, rijbewijs, salaris-indicatie, profielschets, interne notities |
| **Ontvangers** | Bureau (recruiter + setter), opdrachtgever (alleen voornaam + profiel) |
| **Doorgifte buiten EER** | Nee — Anthropic AI verwerkt zonder data te bewaren |
| **Bewaartermijn** | 4 weken na laatste activiteit; talentpool max 1 jaar met toestemming |
| **Beveiliging** | TLS, encryption at rest, RLS, audit-log, 2FA admin |

## Verwerking 2 — Opdrachtgever-administratie

| Veld | Inhoud |
|---|---|
| **Doel** | Voorstellen naar opdrachtgevers sturen + plaatsingen administreren |
| **Rechtsgrond** | Uitvoering overeenkomst (art. 6 lid 1 sub b) |
| **Categorieën betrokkenen** | Contactpersonen van opdrachtgever-bedrijven |
| **Categorieën gegevens** | Bedrijfsnaam, contactpersoon, e-mail, telefoon, adres, KvK |
| **Ontvangers** | Bureau (recruiter, admin) + interne backoffice GRYWO |
| **Doorgifte buiten EER** | Nee |
| **Bewaartermijn** | Duur samenwerking + 7 jaar fiscaal |
| **Beveiliging** | Idem als verwerking 1 |

## Verwerking 3 — Bureau-medewerkers (setters, recruiters, admins)

| Veld | Inhoud |
|---|---|
| **Doel** | Toegang tot Noah ATS verlenen. Coaching + prestatiebeheer uitsluitend voor setters (recruiters/admins worden hier niet voor verwerkt). |
| **Rechtsgrond** | Uitvoering overeenkomst (art. 6 lid 1 sub b) |
| **Categorieën betrokkenen** | Medewerkers van aangesloten bureaus |
| **Categorieën gegevens** | NAW, e-mail, telefoon, Voys-nummer, mailbox-credentials (versleuteld), rol, prestatiedata (EOD-rapporten, doelen), Discord-ID |
| **Ontvangers** | Bureau-admin + super-admin (Yorith) |
| **Doorgifte buiten EER** | Nee |
| **Bewaartermijn** | Verwijderd zodra dienstverband eindigt |
| **Beveiliging** | Idem |

## Verwerking 4 — Plaatsings-administratie

| Veld | Inhoud |
|---|---|
| **Doel** | Plaatsingen melden bij backoffice voor facturatie |
| **Rechtsgrond** | Wettelijke verplichting (fiscale bewaarplicht, art. 6 lid 1 sub c) |
| **Categorieën betrokkenen** | Geplaatste kandidaten + klanten |
| **Categorieën gegevens** | Kandidaat-NAW, startdatum, tarief, klant-info |
| **Ontvangers** | Backoffice GRYWO + boekhouder |
| **Doorgifte buiten EER** | Nee |
| **Bewaartermijn** | 7 jaar (fiscaal) |

---

## Subverwerkers

| Naam | Functie | Locatie | DPA getekend |
|---|---|---|---|
| Supabase | Database + opslag + auth | Frankfurt, DE | Standaard via Supabase ToS + DPA-link |
| Vercel | Hosting | EU | Standaard via Vercel ToS + DPA-link |
| Resend | E-mailverzending | Ierland | Standaard via Resend ToS + DPA-link |
| Anthropic | AI-parsing (geen data-opslag) | EU/VS | Standaard via API ToS |

---

## Technische maatregelen

- TLS 1.2+ voor alle verbindingen
- Encryption at rest (AES-256, Supabase default)
- Row-Level-Security in PostgreSQL (multi-tenant isolatie)
- Wachtwoord-hashing via bcrypt
- 2FA op super-admin account
- Audit-log via `voorstel_logs` tabel
- IP-rate-limiting via Vercel Edge

## Organisatorische maatregelen

- Toegang tot productie-data alleen voor super-admin
- Datalek-procedure (zie `03-datalek-procedure.md`)
- Verwerkersovereenkomsten met alle bureaus voordat ze data invoeren
- Privacybeleid publiek op `noah-ats.nl/privacy`
