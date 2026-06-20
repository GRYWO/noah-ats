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

```bash
npm start
```

Voor "altijd aan": laat dit draaien onder een process-manager zodat het na
herstart automatisch opstart, bv. `pm2`:

```bash
npm i -g pm2
pm2 start "npm start" --name noah-zoekbot
pm2 save
pm2 startup   # volg de instructie om bij opstarten te laden
```

## Aandachtspunten

- **Selectors zijn heuristisch.** De zoekveld- en kandidaat-selectors in
  `robin.mjs` zijn een best-effort; finetune ze tegen de echte Robin-pagina.
  Zet `HEADLESS=false` in `.env` om mee te kijken tijdens het zoeken.
- **Eén bot tegelijk.** De wachtrij claimt opdrachten atomisch; draai niet
  meerdere bots op hetzelfde geheim tenzij je dat bewust wilt.
- **`jobdigger`-opdrachten** worden nog niet verwerkt (stap 2/3).
