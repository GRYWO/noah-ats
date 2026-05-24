# Noah ATS — Robin Embed Extensie

Maakt Recruit Robin bruikbaar binnen Noah ATS door de `X-Frame-Options` en `Content-Security-Policy` headers van Robin te verwijderen voor verzoeken vanuit `noah-ats.nl/robin`.

## Installeren (developer mode, voor jou)

1. Open Chrome → `chrome://extensions`
2. Zet rechtsboven **Developer mode** aan
3. Klik **Load unpacked**
4. Kies de map `chrome-extension/` (deze map)
5. Klaar. Ga naar `https://noah-ats.nl/robin` en Robin zou binnen Noah moeten laden.

## Wanneer werkt het?

- Alleen in Chrome of Edge (Chromium-based browsers)
- Alleen als de gebruiker de extensie geïnstalleerd heeft
- Zonder extensie blijft de iframe wit, gebruik dan de "Open in nieuw tabblad" knop

## Publiceren op Chrome Web Store (voor je team)

1. Maak account op https://chrome.google.com/webstore/devconsole — €5 eenmalig
2. Zip de inhoud van `chrome-extension/` (NIET de map zelf, maar de bestanden erin)
3. Upload op de developer console + vul beschrijving in
4. Wachten op review (1-3 dagen)
5. Deel de install-link met je team

## Hoe werkt het technisch?

De extensie gebruikt Chrome's `declarativeNetRequest` API. Voor élke response van `app.recruitrobin.com` wordt:
- `X-Frame-Options` header verwijderd
- `Content-Security-Policy` header verwijderd
- `Content-Security-Policy-Report-Only` header verwijderd

Zo wordt Robin niet meer geblokkeerd door de browser als iframe.
