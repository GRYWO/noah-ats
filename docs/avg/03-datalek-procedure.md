# Datalek-procedure — Noah ATS / GRYWO

Conform AVG art. 33-34 en de richtlijnen van de Autoriteit Persoonsgegevens (AP).

## Wat is een datalek?

Een datalek is iedere inbreuk op de beveiliging waarbij persoonsgegevens **onbedoeld of onrechtmatig**:

- vernietigd, verloren of gewijzigd worden
- toegankelijk worden voor onbevoegden
- gekopieerd of meegenomen worden

**Voorbeelden:**
- Gehackt account (bv. super-admin)
- Per ongeluk verkeerd geadresseerde mail met kandidaat-data
- Verloren laptop / telefoon met toegang tot Noah ATS
- Database-export naar verkeerde plek
- Lek bij Supabase / Vercel / Resend (subverwerker)

---

## Stap-voor-stap procedure

### Stap 1 — Direct na ontdekking (binnen 1 uur)

1. **Stop het lek** — log de aanvaller eruit, draai wachtwoorden, blokkeer accounts
2. **Documenteer** wat je weet:
   - Wanneer ontdekt?
   - Hoe is het ontstaan?
   - Welke data is geraakt? (categorieën + aantal personen)
   - Wie zijn de betrokkenen?
3. **Informeer Yorith** als hij niet zelf de ontdekker is

### Stap 2 — Inschatten ernst (binnen 4 uur)

Beoordeel:

| Vraag | Hoog risico? |
|---|---|
| Gevoelige data (gezondheid, financieel, BSN)? | Ja → meld zeker |
| Veel personen (>100)? | Ja → meld zeker |
| Data ongeschermd op internet? | Ja → meld zeker |
| Alleen interne medewerker met legitieme toegang? | Mogelijk geen meldplicht |

**Twijfel?** Altijd melden — beter te veel dan te weinig.

### Stap 3 — Melden bij Autoriteit Persoonsgegevens (binnen 72 uur)

URL: https://autoriteitpersoonsgegevens.nl/nl/zelf-doen/gegevenslekken-melden

Vermeld:
- Aard van het lek
- Categorieën + aantal betrokkenen
- Categorieën + aantal records
- Genomen / te nemen maatregelen
- Naam + contactgegevens FG (of Yorith als geen FG)

### Stap 4 — Bureaus informeren (binnen 24 uur na vaststelling)

E-mail naar alle bureau-admins waarvan kandidaten geraakt zijn. Sjabloon:

> **Onderwerp:** Belangrijke melding over jouw kandidaat-data
>
> Beste [naam],
>
> Op [datum] is bij ons een datalek vastgesteld. Persoonsgegevens van [aantal] kandidaten van jouw bureau zijn mogelijk gelekt: [welke categorieën].
>
> Wat we hebben gedaan: [maatregelen].
> Wat jij moet doen: [actie].
>
> Volledige toelichting en vragen: yorith@grywo.nl / 085-4016082.

### Stap 5 — Betrokkenen informeren (bij hoog risico, "zonder onredelijke vertraging")

Alleen verplicht bij **hoog risico voor rechten en vrijheden**. Bij gegevens uit ATS meestal alleen bij grote lekken (gevoelige medische / financiële data, of identificeerbare combinatie van NAW + CV).

Bureau informeert zijn eigen kandidaten — GRYWO ondersteunt met mail-templates.

### Stap 6 — Documenteren

Sla alles op in het `datalekregister`:

| Datum | Aard | Aantal | Gemeld AP? | Gemeld betrokkenen? | Maatregelen |
|---|---|---|---|---|---|

Bewaartermijn: 5 jaar na lek.

---

## Preventie

- **Maandelijks:** check wachtwoord-sterkte super-admin
- **Per kwartaal:** review wie productie-toegang heeft
- **Bij elke release:** dependencies updaten (npm audit)
- **Continu:** Supabase audit-logs scannen op verdachte activiteit

## Contact bij vermoeden van een lek

- **Primary:** Yorith Hulzebosch — yorith@grywo.nl — 085-4016082
- **Backup:** _[andere contactpersoon]_

---

## Datalekregister

| Datum | Beschrijving | Categorie data | Aantal personen | Gemeld AP | Gemeld bureaus | Status |
|---|---|---|---|---|---|---|
| _Nog geen lekken_ | | | | | | |
