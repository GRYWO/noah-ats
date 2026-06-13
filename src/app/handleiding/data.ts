// Volledige inhoud van het Noah-ATS handleiding-boekwerk.
// Per hoofdstuk: titel, korte intro, lange uitleg in secties.

export type Sectie = {
  kop: string;
  tekst: string[];
  lijst?: string[];
  callout?: { type: "info" | "let-op" | "tip"; tekst: string };
};

export type Hoofdstuk = {
  slug: string;
  nummer: string;
  titel: string;
  intro: string;
  icoon: string; // emoji
  kleur: "paars" | "groen" | "geel" | "blauw" | "rood" | "oranje" | "roze" | "cyaan";
  secties: Sectie[];
};

export const HOOFDSTUKKEN: Hoofdstuk[] = [
  // ─────────────────────────────────────────────────────────
  {
    slug: "wat-is-noah",
    nummer: "01",
    titel: "Wat is Noah?",
    intro: "Het hart van Noah recruitment — één plek voor recruitment, voorstellen, plaatsingen en coaching.",
    icoon: "🌟",
    kleur: "paars",
    secties: [
      {
        kop: "De missie",
        tekst: [
          "Noah is een multi-tenant SaaS-platform dat de hele recruitment-cyclus afhandelt: van kandidaat-werving via Jobdigger, intake-gesprekken, voorstellen aan opdrachtgevers, contract-tekenen, plaatsing, tot dagelijkse coaching van het belteam.",
          "Het is gebouwd voor uitzendbureaus en setter-bureaus die hun proces willen professionaliseren zonder vast te zitten aan duur, onflexibel branche-pakket-software.",
        ],
      },
      {
        kop: "Wat onderscheidt Noah",
        tekst: [
          "Drie dingen waar geen andere ATS aan komt:",
        ],
        lijst: [
          "Eén platform voor élke rol — super-admin, bureau-admin, recruiter, setter, intern personeel — met automatische scheiding van rechten en data.",
          "AVG-proof by design — kandidaten hebben hun eigen 'mijn-data'-portaal (artikel 15 + 17), eIDAS-SES-handtekeningen, DPA-flow voor bureaus.",
          "AI ingebouwd waar het écht helpt — Robin (Claude) parseert CV's, schrijft voorstellen, controleert contracten. Niet als gimmick, als versneller.",
        ],
      },
      {
        kop: "Voor wie",
        tekst: [
          "Noah bedient drie groepen tegelijkertijd via één codebase:",
        ],
        lijst: [
          "Recruitmentbureaus (bureau-admin + recruiters) — beheren hun eigen kandidaten en opdrachtgevers binnen hun tenant.",
          "Setter-stoel-gebruikers (individuele setters) — werken met eigen abonnement, eigen kandidaten, los van bureaus.",
          "Noah recruitment-team (super-admin Yorith, sales-admin Pepijn, intern personeel Wouter) — beheren alle bureaus, abonnementen, en de finance-cockpit.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "rollen-en-rechten",
    nummer: "02",
    titel: "Rollen & rechten",
    intro: "Wie ziet wat, wie kan wat — automatische scheiding op rol-niveau.",
    icoon: "👥",
    kleur: "blauw",
    secties: [
      {
        kop: "De vijf rollen",
        tekst: [
          "Elke ingelogde gebruiker heeft één rol die wordt opgeslagen in profiles.rol. De sidebar, het dashboard en de RLS-regels in Supabase bepalen op basis hiervan wat zichtbaar is.",
        ],
      },
      {
        kop: "Super-admin",
        tekst: [
          "Yorith Hulzebosch (yorith@noah-recruitment.nl / yorith@grywo.com). Alleen op basis van e-mail — hardcoded in src/utils/auth.ts.",
          "Ziet alles: alle bureaus, alle kandidaten, alle abonnementen, performance-monitor, archief, documenten-beheer.",
          "Wordt nooit geblokkeerd door bureau-abonnement-checks en omzeilt de single-device-policy niet maar de inactiviteits-uitlog wel niet (zie hoofdstuk Beveiliging).",
        ],
      },
      {
        kop: "Sales-admin",
        tekst: [
          "Pepijn (kan_abonnementen_beheren = true op zijn profile).",
          "Ziet bureaus, kan abonnementen aanpassen, ziet de cockpit. Maar geen toegang tot interne documenten en archief.",
        ],
      },
      {
        kop: "Bureau-admin",
        tekst: [
          "Admin binnen een tenant. Heeft volledige toegang tot zijn bureau: users, kandidaten, voorstellen, opdrachtgevers. Ziet geen andere bureaus.",
        ],
      },
      {
        kop: "Recruiter",
        tekst: [
          "Werkt binnen een bureau. Beheert kandidaten + voorstellen. Ziet geen finance, geen users-beheer.",
        ],
      },
      {
        kop: "Setter",
        tekst: [
          "Belteam. Werkt aan bellijst (Jobdigger), intakes, dagelijkse EOD-rapporten. Heeft eigen abonnement (€250/mnd setter-stoel) of zit als sub-rol onder een bureau.",
        ],
      },
      {
        kop: "Intern personeel",
        tekst: [
          "Vlag is_intern_personeel op profiles. Voor Wouter (interne hulp): heeft admin-rol maar wordt nooit geblokkeerd door bureau-abonnement-check, want geen klant.",
          "Ziet ook Jobdigger en Robin (anders dan een echte bureau-admin).",
        ],
        callout: {
          type: "info",
          tekst: "Verwarrend? Onthoud: rol = wat je doet. Flags (is_intern_personeel, kan_abonnementen_beheren) = uitzonderingen voor Noah recruitment-interne mensen.",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "bureau-aanmaak",
    nummer: "03",
    titel: "Bureau-aanmaak & DPA",
    intro: "Hoe een nieuwe klant van eerste klik tot betaald abonnement komt.",
    icoon: "🏢",
    kleur: "groen",
    secties: [
      {
        kop: "De volledige flow",
        tekst: [
          "Sinds juni 2026 is dit een payment-first flow: bureau krijgt pas inloggegevens nádat het abonnement betaald is.",
        ],
        lijst: [
          "1. Yorith of Pepijn maakt bureau aan via /bureaus → kiest plan (Starter €5k / Pro €10k / Enterprise €15k)",
          "2. Bureau ontvangt automatisch DPA per mail (verwerkersovereenkomst)",
          "3. Contactpersoon tekent DPA via tekenflow (token-based, geen login)",
          "4. Direct na tekenen: Stripe Checkout-mail wordt automatisch verstuurd",
          "5. Bureau betaalt setup-fee + eerste maand via Stripe",
          "6. Stripe webhook ontvangt checkout.session.completed",
          "7. Webhook stuurt welkomstmail mét inloggegevens (random gegenereerd wachtwoord)",
          "8. Bureau-admin logt in → ziet dashboard van zijn tenant",
        ],
      },
      {
        kop: "Wat als bureau niet betaalt?",
        tekst: [
          "Geen automatisch geblokkeerd, want zonder login kan men ook niet inloggen. Maar als betaling later faalt (Stripe past status aan via webhook):",
        ],
        lijst: [
          "abonnementen.status → 'achterstallig' of 'geblokkeerd'",
          "Middleware checkt bij elke request: admin/recruiter zonder actieve abo → uitloggen + redirect naar /login?bureau_abonnement=achterstallig",
          "Pas na nieuwe Stripe-betaling (invoice.paid event) → status weer 'actief' → toegang herstelt automatisch",
        ],
        callout: {
          type: "let-op",
          tekst: "Super-admin (Yorith) en intern personeel (Pepijn, Wouter) worden NOOIT geblokkeerd door deze check. Hardcoded uitzondering in middleware.",
        },
      },
      {
        kop: "Auto-upgrade abonnement",
        tekst: [
          "Wanneer bureau-admin een extra recruiter toevoegt, past het abonnement zich automatisch aan via Stripe (prorata, geen handmatige actie):",
        ],
        lijst: [
          "1 recruiter → Starter (€5.000/mnd)",
          "2-3 recruiters → Pro (€10.000/mnd)",
          "4+ recruiters → Enterprise (€15.000/mnd)",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "kandidaten",
    nummer: "04",
    titel: "Kandidaten & Kanban",
    intro: "Van CV-binnenkomst tot plaatsing — de hele kandidaten-reis.",
    icoon: "👤",
    kleur: "oranje",
    secties: [
      {
        kop: "Hoe komen kandidaten binnen",
        tekst: [
          "Vier kanalen, allemaal landen in dezelfde kandidaten-tabel met tenant_id voor data-scheiding:",
        ],
        lijst: [
          "Jobdigger-extensie: 1-klik vanuit een vacature pagina, CV wordt automatisch geparsed door Robin (Claude) en als kandidaat aangemaakt",
          "Handmatig toevoegen via /kandidaten/nieuw — met optie 'handmatig doorzetten' naar specifieke recruiter",
          "Inkomende mail met CV-bijlage → automatische import (toekomstig)",
          "Robin AI extract uit gesprek-notities (toekomstig)",
        ],
      },
      {
        kop: "Kanban: de werkstroom",
        tekst: [
          "Zes kolommen, elke kolom is een stap in het proces. Drag-and-drop verplaatst kaarten en triggert mail-flows:",
        ],
        lijst: [
          "1. Nieuw — net binnen, intake plannen",
          "2. Intake — gesprek gepland of bezig",
          "3. Voorstel — naar opdrachtgever verstuurd",
          "4. In proces — opdrachtgever overweegt, gesprekken lopen",
          "5. Geplaatst — contract getekend, kandidaat aan de slag",
          "6. Niet gelukt — afgewezen of zelf afgehaakt",
        ],
        callout: {
          type: "tip",
          tekst: "Bij overgang naar 'In proces' krijgt opdrachtgever automatisch de 'we zijn gestart'-mail.",
        },
      },
      {
        kop: "Intake-wizard",
        tekst: [
          "Zes-staps formulier dat de recruiter doorloopt met kandidaat aan de telefoon. Slaat per stap op (geen verlies bij refresh).",
          "Inclusief automatische rode-vlaggen-detectie via Robin AI: ongebruikelijke contracten, hoge tarieven, vage CV's worden gemarkeerd voor extra controle.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "voorstellen",
    nummer: "05",
    titel: "Voorstellen aan opdrachtgevers",
    intro: "Hoe kandidaten naar bedrijven worden gepresenteerd — en hoe akkoord wordt vastgelegd.",
    icoon: "📤",
    kleur: "cyaan",
    secties: [
      {
        kop: "Voorstel maken",
        tekst: [
          "Recruiter selecteert kandidaat → klikt 'Voorstel versturen' → kiest opdrachtgever uit CRM → past begeleidende tekst aan (Robin kan dit AI-genereren op basis van kandidaat-profiel + opdracht-omschrijving).",
        ],
        lijst: [
          "CV automatisch bijvoegen (toggle)",
          "Tarief tonen of niet (toggle — handig bij hoge marges)",
          "Aliasnaam gebruiken (toggle — privacy van kandidaat tot definitief akkoord)",
        ],
      },
      {
        kop: "Wat opdrachtgever krijgt",
        tekst: [
          "Mail met unieke token-link naar /voorstel/[token]. Geen login nodig, alleen die persoon kan reageren.",
        ],
        lijst: [
          "Volledig voorstelprofiel — alleen voornaam (geen achternaam totdat akkoord)",
          "Eén klik: 'Ja, ik wil kennismaken' → datum kiezen via /kies-datum/[token]/[index]",
          "Eén klik: 'Nee, niet geschikt' → met reden-veld",
          "Eén klik: 'Eerst meer info' → bericht naar Noah recruitment",
        ],
      },
      {
        kop: "Wat er gebeurt na akkoord",
        tekst: [
          "Datum gekozen → automatisch event in agenda (recruiter + opdrachtgever + kandidaat), reminder-mail 30 min van tevoren via cron-job.",
          "Bij plaatsing → meldPlaatsing-actie genereert factuur + DPA-bevestiging + activeert geplaatste-mail naar backoffice voor administratie.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "robin-ai",
    nummer: "06",
    titel: "Robin AI",
    intro: "De ingebouwde Claude-assistent — niet als chatbot, maar als versneller in de workflow.",
    icoon: "✨",
    kleur: "roze",
    secties: [
      {
        kop: "Wat Robin doet",
        tekst: [
          "Robin draait op de Anthropic Claude API en is geïntegreerd op specifieke punten waar AI de meeste tijd bespaart:",
        ],
        lijst: [
          "CV parsen → Naam, contact, werkervaring, tarief-indicatie automatisch ingevuld",
          "Voorstel-tekst schrijven → Op basis van kandidaat + opdracht, in jouw schrijfstijl",
          "Contract-controle → Detecteert ongebruikelijke clausules en concurrentiebedingen",
          "Profielschets keuren → Vergelijkt kandidaat-CV met opdracht-eisen",
          "Rode-vlaggen in intake → Markeert verdachte zinnen voor extra check",
        ],
      },
      {
        kop: "Wat Robin NIET doet",
        tekst: [
          "Geen onafhankelijke beslissingen. Geen mails versturen zonder bevestiging. Geen DB-mutaties zonder dat een gebruiker op een knop drukt.",
          "Robin is een suggestie-laag. Recruiter blijft eindverantwoordelijk.",
        ],
        callout: {
          type: "info",
          tekst: "Robin gebruikt Claude Sonnet voor snelle taken en Opus voor zware analyse zoals contract-extractie.",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "jobdigger",
    nummer: "07",
    titel: "Jobdigger & Chrome-extensie",
    intro: "1-klik kandidaten importeren vanuit Jobdigger via de Noah-browser-extensie.",
    icoon: "📞",
    kleur: "paars",
    secties: [
      {
        kop: "Hoe het werkt",
        tekst: [
          "Setter is bezig met een vacature op Jobdigger.nl → klikt op 'Maak Jobdigger-zoekopdracht' in Noah → Noah-extensie pakt de filters → Jobdigger-zoekopdracht wordt automatisch ingevuld → setter start bellen.",
        ],
      },
      {
        kop: "Andere kant op",
        tekst: [
          "Setter klikt op een CV in Jobdigger → klikt op de Noah-knop in browser → kandidaat verschijnt direct in Noah onder 'Nieuw' in kanban, met CV én Robin-geëxtraheerde data.",
        ],
      },
      {
        kop: "De extensie",
        tekst: [
          "Chrome-extensie v1.4.0 in Chrome Web Store. Manifest V3, content scripts voor jobdigger.nl en noah-ats.nl.",
          "Bevat: background.js (filter-storage), content-noah.js (filters lezen op Noah-pagina's), content-jobdigger.js (filters invullen + CV's importeren).",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "coaching",
    nummer: "08",
    titel: "Coaching & EOD-rapport",
    intro: "Dagelijkse setter-coaching via End-of-Day rapporten — automatisch en persoonlijk.",
    icoon: "🎯",
    kleur: "rood",
    secties: [
      {
        kop: "Waarom EOD",
        tekst: [
          "Setter-werk is mentaal zwaar. Een dagelijkse reflectie van 5 minuten verhoogt langetermijn-prestaties enorm. Noah dwingt dit niet af, maar maakt het de makkelijkste weg.",
        ],
      },
      {
        kop: "Wat een setter elke dag doet",
        tekst: [
          "Aan het einde van de werkdag verschijnt een blokkerende banner: 'EOD invullen voor je uitlogt'.",
        ],
        lijst: [
          "5 emoji-opties: hoe voelde je je vandaag?",
          "Wat liep top? (1 zin)",
          "Wat had beter gekund? (1 zin)",
          "Eigen records: gesprekken, intakes, voorstellen — automatisch geteld",
          "Doelen voor deze week — voortgangsbalk",
          "Optie: 'Vraag coaching van [admin]' → admin krijgt notificatie",
        ],
      },
      {
        kop: "Wat admin/coach ziet",
        tekst: [
          "/coaching pagina toont alle setters in jouw bureau met filter op coaching-aanvragen. Detailweergave per setter met records, doelen, EOD-historie en reactie-thread.",
          "Admin kan reactie sturen → setter krijgt notificatie met kleurmarkering in NotificatieBel.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "agenda",
    nummer: "09",
    titel: "Agenda",
    intro: "Centrale planning voor team, intakes en herinneringen.",
    icoon: "📅",
    kleur: "blauw",
    secties: [
      {
        kop: "Drie soorten events",
        tekst: [
          "Alles in dezelfde agenda_events tabel met type-veld:",
        ],
        lijst: [
          "Intake — gepland door recruiter bij nieuwe kandidaat",
          "Kennismaking — gepland door opdrachtgever via voorstel-link",
          "Team-event — alleen admin kan deze aanmaken (stand-ups, overleg)",
        ],
      },
      {
        kop: "Rol-filter",
        tekst: [
          "Setter ziet alleen eigen intakes. Recruiter ziet eigen + team. Admin ziet alles van zijn bureau. Super-admin ziet alles van alle bureaus.",
        ],
      },
      {
        kop: "Automatische reminders",
        tekst: [
          "Vercel-cron draait elke minuut /api/cron/agenda-reminder → checkt events die over 30 min beginnen → stuurt mail en/of push-notificatie naar deelnemers.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "documenten",
    nummer: "10",
    titel: "Documenten & eIDAS-handtekening",
    intro: "Contracten, NDA's en DPA's tekenen — rechtsgeldig volgens EU-wet.",
    icoon: "✍️",
    kleur: "groen",
    secties: [
      {
        kop: "Wat Noah ondertekent",
        tekst: [
          "Alle juridische documenten tussen Noah recruitment en derden, gecategoriseerd:",
        ],
        lijst: [
          "DPA (verwerkersovereenkomst) — bureau bij aanmaak",
          "NDA (geheimhouding) — kandidaat of opdrachtgever",
          "Gebruiksvoorwaarden — nieuwe users",
          "Plaatsings-contract — bij definitieve plaatsing",
          "Werkovereenkomst — tussen kandidaat en opdrachtgever",
        ],
      },
      {
        kop: "eIDAS Simple Electronic Signature (SES)",
        tekst: [
          "Noah implementeert de basis-vorm van rechtsgeldige elektronische handtekening:",
        ],
        lijst: [
          "Token-based link per persoon (alleen die specifieke persoon kan tekenen)",
          "IP-adres + user-agent + tijdstempel opgeslagen als audit-trail",
          "Handtekening: getypt óf getekend op touchscreen",
          "Akkoord-checkbox AVG verplicht",
          "PDF wordt gegenereerd met pdf-lib mét handtekening + audit-info ingebed",
        ],
      },
      {
        kop: "Documenten-beheer",
        tekst: [
          "/documenten alleen voor super-admin. Toont alle uitstaande, getekende en verlopen documenten met snelle filters.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "abonnementen",
    nummer: "11",
    titel: "Abonnementen & Stripe",
    intro: "Hoe betalingen verlopen — bureau-abonnementen + setter-stoelen + de cockpit.",
    icoon: "💳",
    kleur: "geel",
    secties: [
      {
        kop: "Twee soorten abonnementen",
        tekst: [
          "Volledig gescheiden Stripe-flows die los van elkaar werken:",
        ],
        lijst: [
          "Bureau-abonnement — €5k/€10k/€15k per maand, +eenmalige setup-fee, contract loopt per maand",
          "Setter-stoel — €250/maand voor individuele setters die los van een bureau werken",
        ],
      },
      {
        kop: "Stripe webhook events",
        tekst: [
          "Noah luistert op /api/webhooks/stripe naar vijf events:",
        ],
        lijst: [
          "checkout.session.completed — eerste betaling → activeer + welkomstmail",
          "invoice.paid — maandelijkse betaling gelukt → status 'actief'",
          "invoice.payment_failed → status 'achterstallig'",
          "customer.subscription.updated → plan-wijziging (bij auto-upgrade)",
          "customer.subscription.deleted → status 'geblokkeerd'",
        ],
      },
      {
        kop: "De cockpit (/abonnementen-beheer)",
        tekst: [
          "Super-admin overzicht met alles op één scherm:",
        ],
        lijst: [
          "KPI-cards: actieve bureaus, MRR, churn",
          "MRR-grafiek over 12 maanden",
          "Bureau-tabel met filters + zoek + CSV-export",
          "Setter-tabel met filters",
          "Interne notities per abonnement",
          "Acties: 'Stripe-mail opnieuw versturen', 'Opzeggen', 'Reactiveren'",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "beveiliging",
    nummer: "12",
    titel: "Beveiliging & AVG",
    intro: "Hoe Noah data beschermt — technisch én juridisch.",
    icoon: "🔐",
    kleur: "rood",
    secties: [
      {
        kop: "Multi-tenant data-isolatie",
        tekst: [
          "Alle tabellen met user-data hebben tenant_id. Supabase Row Level Security policies dwingen af dat een gebruiker ALLEEN rijen van zijn eigen tenant ziet — afgevangen op DB-niveau, niet in code (kan niet omzeild worden via bugs).",
        ],
      },
      {
        kop: "Single-device-policy",
        tekst: [
          "Eén user mag maar op één apparaat tegelijk ingelogd zijn:",
        ],
        lijst: [
          "Bij login: random token gegenereerd, in httpOnly cookie + DB opgeslagen",
          "Bij elke request: middleware vergelijkt cookie met DB",
          "Niet gelijk → uitloggen + redirect naar /login?reden=ander_apparaat",
        ],
      },
      {
        kop: "Inactiviteits-uitlog",
        tekst: [
          "Na 60 minuten geen activiteit (laatst_actief_op timestamp niet ververst) → automatisch uitgelogd met melding '⏱ Je bent automatisch uitgelogd na 60 minuten inactiviteit'.",
        ],
      },
      {
        kop: "Twee-factor authenticatie",
        tekst: [
          "Optionele MFA via Supabase Auth voor extra-gevoelige rollen. Activeerbaar per user via /instellingen.",
        ],
      },
      {
        kop: "AVG-rechten voor kandidaten",
        tekst: [
          "Elke kandidaat krijgt automatisch een persoonlijke /mijn-data/[token] link:",
        ],
        lijst: [
          "Artikel 15 — inzage in eigen data (download als JSON)",
          "Artikel 17 — recht op vergetelheid (1 klik wist alles, behalve wettelijke bewaarverplichting)",
          "Geen login nodig — alleen de token-houder kan zijn data zien",
        ],
        callout: {
          type: "info",
          tekst: "Dit is geen optie maar verplicht volgens AVG art. 15+17. Noah maakt dat zichtbaar en bruikbaar voor kandidaten.",
        },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "performance",
    nummer: "13",
    titel: "Performance-monitor",
    intro: "Hoe snel draait Noah, waar zit vertraging, en hoe meten we dat.",
    icoon: "⚡",
    kleur: "geel",
    secties: [
      {
        kop: "PerfMonitor widget",
        tekst: [
          "Super-admin ziet rechtsonderin een continue snelheidsmeter met P50/P95/P99 voor de zwaarste pagina's, gekleurd: groen <500ms, oranje 500-1000ms, rood >1000ms.",
          "Tabs voor 1 uur / 24 uur / 1 week — laat trends zien zonder dat oude metingen recente verbeteringen verbergen.",
        ],
      },
      {
        kop: "Wat we meten",
        tekst: [
          "Op 7 pagina's wordt op de server een latency-meting gedaan: /dashboard, /kandidaten, /kanban, /voorstellen, /opdrachtgevers, /agenda, /coaching.",
          "Resultaat gaat naar perf_metrics tabel met page + duration_ms + timestamp.",
        ],
      },
      {
        kop: "Optimalisaties",
        tekst: [
          "Gedaan om de baseline te verlagen:",
        ],
        lijst: [
          "Promise.all wins — parallelle queries waar dat veilig kan",
          "count: 'planned' ipv 'exact' — gebruikt Postgres index-statistieken (~100x sneller)",
          "Geïndexeerde kolommen op de zwaarste tabellen (14 indexes)",
          "unstable_cache voor data die langzaam verandert",
          "Service worker caching voor statische assets",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "techniek",
    nummer: "14",
    titel: "Onder de motorkap",
    intro: "Stack, architectuur, en waarom voor deze keuzes is gekozen.",
    icoon: "⚙️",
    kleur: "cyaan",
    secties: [
      {
        kop: "De stack",
        tekst: [
          "Bewust gekozen voor minimaal aantal grote, betrouwbare componenten:",
        ],
        lijst: [
          "Next.js 16 met App Router + Turbopack — fullstack framework, server actions ipv aparte API-laag",
          "Supabase — Postgres + Auth + Storage + Realtime + RLS, geen losse delen",
          "Vercel — hosting, edge runtime, cron jobs, deployment in <60 seconden",
          "Stripe — abonnementen, facturen, webhooks",
          "Resend — transactionele mail vanaf grywo.nl (geverifieerd domein)",
          "Anthropic Claude API — Robin (Sonnet voor snel, Opus voor zwaar)",
          "Tailwind CSS — utility-first styling, geen aparte CSS-bestanden",
          "Lucide icons — consistente icon-set",
        ],
      },
      {
        kop: "Waarom géén apart backend-framework",
        tekst: [
          "Next.js 16 server actions vervangen REST/GraphQL. Code dichter bij de UI, type-safe end-to-end, geen versie-mismatch tussen front- en backend.",
          "Minder code, snellere ontwikkeling, minder dingen die kapot kunnen gaan.",
        ],
      },
      {
        kop: "Deployment",
        tekst: [
          "Git push naar main branch → Vercel start automatisch een productie-deploy → online in 1-2 minuten. Preview-deployments voor andere branches.",
          "Zero-downtime — oude versie blijft draaien tot nieuwe versie klaar is.",
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  {
    slug: "geschiedenis",
    nummer: "15",
    titel: "Tijdlijn — wat is wanneer gebouwd",
    intro: "Korte geschiedenis van Noah, in volgorde van bouw.",
    icoon: "📜",
    kleur: "paars",
    secties: [
      {
        kop: "Fase 1 — Fundament",
        tekst: [
          "Bureau-beheer, basis kandidaten + opdrachtgevers, multi-tenant via RLS, eerste mail-templates, NDA-flow.",
        ],
      },
      {
        kop: "Fase 2 — Voorstellen & plaatsingen",
        tekst: [
          "Token-based voorstel-link voor opdrachtgevers, datum-kiezen-flow, plaatsing-melding, factuur-generatie.",
        ],
      },
      {
        kop: "Fase 3 — Agenda + reminders",
        tekst: [
          "Agenda_events tabel, rol-based filter, cron-reminder 30 min van tevoren, team-events.",
        ],
      },
      {
        kop: "Fase 4 — Coaching & EOD",
        tekst: [
          "EOD-rapport flow, coaching-aanvragen, dashboard voor admin, blokkerende banner.",
        ],
      },
      {
        kop: "Fase 5 — Intake-wizard + Robin",
        tekst: [
          "AI-geassisteerde intake, rode vlaggen, Robin profielschets-check, contract-controle.",
        ],
      },
      {
        kop: "Fase 6 — Documenten & eIDAS",
        tekst: [
          "Document-tekenflow, audit-trail, PDF-generatie met ingebedde handtekening, DPA voor bureaus.",
        ],
      },
      {
        kop: "Fase 7 — Stripe & abonnementen",
        tekst: [
          "Bureau-abonnementen via Checkout, setter-stoel apart, webhook-handling, cockpit voor super-admin.",
        ],
      },
      {
        kop: "Fase 8 — Performance",
        tekst: [
          "Indexes, count planned, Promise.all, PerfMonitor widget, cache-strategieën, service worker.",
        ],
      },
      {
        kop: "Fase 9 — Beveiliging",
        tekst: [
          "Single-device-policy, inactiviteits-uitlog, hardcoded uitzonderingen voor Noah recruitment-team.",
        ],
      },
      {
        kop: "Fase 10 — Payment-first bureau-flow",
        tekst: [
          "Plan-keuze bij aanmaak, DPA → Stripe → welkomstmail, automatische blokkade bij niet-betaling, auto-upgrade op aantal recruiters.",
        ],
      },
      {
        kop: "Fase 11 — Jobdigger 1-klik + extensie",
        tekst: [
          "Chrome-extensie v1.4.0, content-scripts voor auto-fill in Jobdigger, kandidaat-import vanuit vacature-pagina.",
        ],
      },
      {
        kop: "Wat komt nog",
        tekst: [
          "Native iOS + Android apps via React Native, mailbox-integratie voor inkomende CV's, geavanceerde rapportages voor super-admin, Apple Watch widget.",
        ],
        callout: {
          type: "tip",
          tekst: "De webapp blijft altijd het hart — de native apps gebruiken dezelfde Supabase-backend.",
        },
      },
    ],
  },
];
