# Noah zoekbot (altijd-aan machine)

Draait op een kantoor-Mac die altijd aan staat. Pollt de ATS voor zoekopdrachten
(`zoek_jobs`), draait ze in **Robin** (ingelogd als Yorith) en meldt het
resultaat terug. Setters loggen zelf nooit in bij Robin — de bot doet dat.

## Hoe het werkt

```
Setter klikt "Zoek kandidaten" in de ATS
   → zoek_jobs (open)
        → bot pollt /api/bot/jobs en claimt de opdracht
             → Robin-zoekopdracht draaien + kandidaten scrapen
                  → POST /api/bot/jobs/resultaat
                       → bellijst bij de vacature
```

## Eenmalige installatie (op de kantoor-Mac)

Vereist **Node 20.6+**.

1. Installeer dependencies en de browser:
   ```bash
   cd zoekbot
   npm install
   npx playwright install chromium
   ```
2. Maak het configbestand:
   ```bash
   cp .env.example .env
   ```
   Vul in `.env` de `BOT_SECRET` in — **exact dezelfde waarde** als de
   `BOT_SECRET` environment-variabele in de ATS (Vercel).
3. Log éénmalig handmatig in als Yorith:
   ```bash
   npm run login:robin
   ```
   Er opent een browservenster. Log in bij Robin (en Jobdigger via OTYS indien
   nodig). Sluit daarna het venster — de sessie wordt bewaard in `robin-profiel/`.

## Starten / draaiend houden

**Even handmatig (test):**
```bash
npm start
```
Dit draait alleen zolang het Terminal-venster open blijft. Voor "in de kast,
nooit meer naar omkijken" → zie hieronder.

## Automatisch opstarten op de Mac (aanbevolen — één keer instellen)

Met dit script start de bot **vanzelf op** als de Mac aangaat en **herstart hij
vanzelf** als hij ooit crasht. Je hoeft daarna niets meer in de Terminal te typen.

```bash
cd zoekbot
bash installeer-mac.sh
```

Het script vult zelf de juiste paden in en zet de bot aan. Controleren:
```bash
launchctl list | grep noah.zoekbot     # een regel = geregistreerd
tail -f bot.log                         # live meekijken (Ctrl+C om te stoppen)
```

Voor écht "deksel dicht":
- **Automatisch inloggen aan** (Systeeminstellingen → Gebruikers), zodat de bot
  na een herstart opstart zonder dat iemand het wachtwoord intypt.
- **Automatisch slapen uit** (Systeeminstellingen → Batterij/Energie) terwijl de
  Mac op stroom zit, anders pauzeert de bot.

Stoppen of opnieuw laden kan met:
```bash
launchctl unload ~/Library/LaunchAgents/com.noah.zoekbot.plist   # stoppen
launchctl load   ~/Library/LaunchAgents/com.noah.zoekbot.plist   # weer starten
```

### Alternatief: pm2 (ook prima)

```bash
npm i -g pm2
pm2 start "npm start" --name noah-zoekbot
pm2 save
pm2 startup   # volg de instructie om bij opstarten te laden
```

## Draaien op een gratis Oracle Cloud VM (Linux, altijd aan)

Oracle Cloud "Always Free" geeft een ARM-VM die 24/7 gratis blijft draaien.

1. Maak een **Ubuntu** VM aan (Ampere/ARM, Always Free). Inkomende poorten zijn
   niet nodig — de bot belt zelf naar buiten (polling).
2. Installeer Node 20+ en de code:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm git
   git clone https://github.com/GRYWO/noah-ats.git
   cd noah-ats && git checkout herstel/vacatures-robin-flow && cd zoekbot
   npm install
   npx playwright install --with-deps chromium   # --with-deps: systeem-libs voor Chromium
   cp .env.example .env                            # vul BOT_SECRET in
   ```
3. **Login-sessie overzetten** (geen scherm op de server): log één keer in op je
   **eigen Mac** met `npm run login:robin`, en kopieer dan de map mee:
   ```bash
   scp -r robin-profiel ubuntu@<vm-ip>:/home/ubuntu/noah-ats/zoekbot/
   ```
4. **Automatisch starten** met systemd (zie `noah-zoekbot.service`):
   ```bash
   sudo cp noah-zoekbot.service /etc/systemd/system/
   # pas zo nodig User/WorkingDirectory/node-pad aan in dat bestand
   sudo systemctl enable --now noah-zoekbot
   sudo journalctl -u noah-zoekbot -f          # live logs bekijken
   ```

Controleren of 'ie leeft: `cat heartbeat.txt` (tijdstempel ververst elke 5 min).

## Aandachtspunten

- **Selectors zijn heuristisch.** De zoekveld- en kandidaat-selectors in
  `robin.mjs` zijn een best-effort; finetune ze tegen de echte Robin-pagina.
  Zet `HEADLESS=false` in `.env` om mee te kijken tijdens het zoeken.
- **Eén bot tegelijk.** De wachtrij claimt opdrachten atomisch; draai niet
  meerdere bots op hetzelfde geheim tenzij je dat bewust wilt.
- **Datacenter-IP (cloud).** Robin/Jobdigger kunnen een cloud-IP eerder als bot
  zien dan een kantoor-IP → kans op captcha's of uitloggen. Werkt het niet
  betrouwbaar vanaf de VM, draai de bot dan op een kantoor-machine.
- **Jobdigger** wordt ondersteund (`jobdigger.mjs`): de zoekbalk in de ATS zet
  een 'jobdigger'-opdracht in de wachtrij; de bot scrapet de gevonden vacatures
  en levert ze als "vondsten" terug. Zorg dat Jobdigger (via OTYS) is ingelogd in
  hetzelfde profiel. Selectors zijn ook hier best-effort.
