# AVG / Privacy-documentatie — Noah ATS

Map met juridische documenten voor AVG-compliance van GRYWO / Noah ATS.

## Inhoud

| Bestand | Wat | Voor wie |
|---|---|---|
| `01-verwerkersovereenkomst.md` | Template-DPA om met elk bureau te tekenen (art. 28 AVG) | Bureau-onboarding |
| `02-verwerkingsregister.md` | Verwerkingsregister conform art. 30 AVG | Interne admin (Yorith) |
| `03-datalek-procedure.md` | Stap-voor-stap procedure bij vermoed datalek | Bij incident |

## Hoe te gebruiken

### Bij nieuw bureau

1. Open `01-verwerkersovereenkomst.md`
2. Vul de [_velden_] in: bureau-naam, KvK, adres, datum
3. Exporteer naar PDF (in VS Code: install "Markdown PDF" extension → "Markdown PDF: Export (pdf)")
4. Beide partijen tekenen → archiveer in `/docs/avg/getekend/[bureau-naam]-DPA-[datum].pdf`

### Privacybeleid online

De publieke privacy-pagina staat live op:
- https://noah-ats.nl/privacy

Bron-code: `src/app/privacy/page.tsx`

### Bij vermoed datalek

Volg `03-datalek-procedure.md` stap voor stap.

## Versiebeheer

Wijzigingen op deze documenten worden via git getrackt. Bureaus die al hebben getekend hoeven niet opnieuw te tekenen voor cosmetische wijzigingen — wel voor substantiële wijzigingen (subverwerkers, bewaartermijnen, etc.).
