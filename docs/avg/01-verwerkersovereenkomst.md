# Verwerkersovereenkomst — Noah ATS

**Tussen:**

| | |
|---|---|
| **Verwerkingsverantwoordelijke** | _[Naam bureau]_, gevestigd te _[adres]_, KvK _[nummer]_, vertegenwoordigd door _[naam contactpersoon]_ — hierna te noemen "**Bureau**" |
| **Verwerker** | **OneTwoStart NL B.V.** (handelsnaam: GRYWO), gevestigd aan Raasdorperweg 191 A, 1175 KV Lijnden, KvK 96738782, vertegenwoordigd door Yorith Hulzebosch — hierna te noemen "**GRYWO**" |

Datum: _[datum]_

---

## 1. Doel en achtergrond

Bureau heeft GRYWO opdracht gegeven het ATS-platform **Noah ATS** (https://noah-ats.nl) te leveren. Bij die dienstverlening verwerkt GRYWO namens Bureau persoonsgegevens van kandidaten, opdrachtgevers en medewerkers van Bureau. Deze overeenkomst regelt die verwerking conform artikel 28 AVG.

## 2. Verwerkingen

GRYWO verwerkt namens Bureau onder andere:

| Categorie | Persoonsgegevens | Doel |
|---|---|---|
| **Kandidaten** | Naam, e-mail, telefoon, adres, geboortedatum, CV, opleiding, werkervaring, rijbewijs, vrijheidsbeperkingen, salaris, profielschets, notities | Werving en selectie via Bureau |
| **Opdrachtgevers** | Bedrijfsnaam, contactpersoon, e-mail, telefoon, adres | Voorstellen verzenden en plaatsingen administreren |
| **Medewerkers Bureau** | Naam, e-mail, telefoon, rol, mailbox-credentials (versleuteld), prestatiedata (EOD-rapporten, doelen) | Toegang tot platform + coaching |

## 3. Locatie van verwerking

Alle persoonsgegevens worden opgeslagen binnen de Europese Economische Ruimte (EER):

- **Supabase** (Frankfurt, Duitsland) — database en bestandsopslag
- **Vercel** (EU-regio) — applicatiehosting
- **Resend** (Ierland) — e-mailverzending

## 4. Sub-verwerkers

GRYWO maakt gebruik van de volgende sub-verwerkers. Bureau geeft hiervoor toestemming.

| Sub-verwerker | Functie | Locatie |
|---|---|---|
| Supabase Inc. | Database, opslag, authenticatie | EU (Frankfurt) |
| Vercel Inc. | Hosting van de applicatie | EU |
| Resend Inc. | E-mailverzending | EU (Ierland) |
| Anthropic PBC | AI-CV-parsing en profielschets-generatie (data wordt niet bewaard door Anthropic) | EU/VS |

Wijzigingen in subverwerkers worden minimaal 30 dagen vooraf gemeld. Bureau heeft het recht bezwaar te maken; bij gegrond bezwaar kan de overeenkomst worden opgezegd.

## 5. Beveiliging

GRYWO neemt passende technische en organisatorische maatregelen, waaronder:

- TLS 1.2+ versleuteling voor alle data-overdracht
- Encryption at rest (AES-256) op alle opgeslagen data
- Row-Level-Security in de database (tenant-isolatie per bureau)
- Tweestapsverificatie op administratieve accounts
- Wachtwoord-hashing via bcrypt
- Audit-log van alle voorstellen, plaatsingen en afwijzingen
- Beperkte toegang tot productiedata (alleen super-admin)
- Automatische cleanup van kandidaten op de wachtlijst na 7 dagen

## 6. Bewaartermijnen

| Categorie | Bewaartermijn |
|---|---|
| Actieve kandidaten | Zolang ze in actief proces zijn |
| Afgewezen kandidaten | 4 weken na afwijzing (talentpool: max 1 jaar, alleen met expliciete toestemming) |
| Opdrachtgever-gegevens | Zolang de samenwerking duurt + 7 jaar fiscale bewaarplicht |
| Plaatsings-logs | 7 jaar (fiscale verplichting) |
| Medewerker-accounts | Verwijderd zodra dienstverband eindigt |

Na beëindiging van deze overeenkomst worden alle persoonsgegevens van Bureau binnen 30 dagen verwijderd of geretourneerd, naar keuze van Bureau.

## 7. Rechten van betrokkenen

GRYWO ondersteunt Bureau bij verzoeken van betrokkenen (inzage, correctie, verwijdering, dataportabiliteit, bezwaar). Verzoeken worden binnen 5 werkdagen behandeld; binnen 30 dagen afgerond.

## 8. Datalekken

Bij een (vermoedelijk) datalek meldt GRYWO dit **binnen 24 uur** aan Bureau, inclusief:

- Aard van het lek
- Categorieën en aantal betrokkenen
- Mogelijke gevolgen
- Genomen maatregelen

Bureau is verantwoordelijk voor melding aan de Autoriteit Persoonsgegevens (binnen 72 uur) en betrokkenen waar van toepassing.

Datalek-procedure: zie `docs/avg/03-datalek-procedure.md` in de repository.

## 9. Audit-recht

Bureau mag eens per jaar (of bij gegronde reden vaker) een audit uitvoeren op GRYWO's verwerking. GRYWO verleent redelijke medewerking. Kosten zijn voor Bureau, tenzij de audit een ernstige tekortkoming aantoont.

## 10. Aansprakelijkheid

Iedere partij is aansprakelijk voor schade door eigen toedoen. GRYWO's aansprakelijkheid is beperkt tot het bedrag dat Bureau in de 12 maanden voorafgaand aan het schadevoorval aan GRYWO heeft betaald, behalve bij opzet of grove schuld.

## 11. Duur en beëindiging

Deze overeenkomst geldt zolang Bureau gebruikmaakt van Noah ATS. Beëindiging conform de hoofd-dienstverleningsovereenkomst.

## 12. Toepasselijk recht

Op deze overeenkomst is **Nederlands recht** van toepassing. Geschillen worden voorgelegd aan de rechtbank Midden-Nederland, locatie Utrecht.

---

**Ondertekening**

Datum: _________________

Voor Bureau: _________________ (naam, functie, handtekening)

Voor GRYWO: _________________ (Yorith Hulzebosch, eigenaar)
