import type { TourStap } from "@/components/PaginaTour";

// =========================================================
// DASHBOARD
// =========================================================
export const TOUR_DASHBOARD: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom op het dashboard",
    content: "Hier krijg je in één blik de status van je bureau. We lopen door alle blokken." },
  { target: "body", placement: "center", title: "Periode-keuze",
    content: "Bovenaan kies je over welke periode je de cijfers wilt zien: vandaag, week, maand, jaar, of alles." },
  { target: "body", placement: "center", title: "KPI-tegels",
    content: "Vier kerncijfers: openstaande voorstellen, kennismakingen, plaatsingen en omzet. Ze veranderen mee met de gekozen periode." },
  { target: "body", placement: "center", title: "Pipeline-funnel",
    content: "De volledige funnel van interne intake tot geplaatst. Hoe smaller naar rechts, hoe verder in het proces." },
  { target: "body", placement: "center", title: "Setter-performance",
    content: "Overzicht van je setters met calls, afspraken en plaatsingen. Klik door in Coaching voor het detail per setter." },
  { target: "body", placement: "center", title: "Recente voorstellen",
    content: "De laatst uitgestuurde voorstellen met status (wachten / akkoord / afgewezen). Handig voor snelle follow-up." },
];

// =========================================================
// KANDIDATEN (lijst)
// =========================================================
export const TOUR_KANDIDATEN: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom bij Kandidaten",
    content: "Dit is het hart van Noah. Elke kandidaat heeft een eigen detail-pagina met CV, intake, voorstellen en geschiedenis." },
  { target: '[data-tour="kandidaat-nieuw"]',
    title: "Nieuwe kandidaat",
    content: "Klik hier om een kandidaat toe te voegen. Je vult basis-info in en kunt direct een CV uploaden — de AI vult daarna automatisch alle CV-velden voor je." },
  { target: '[data-tour="kandidaat-wachtend"]',
    title: "Wacht op CV",
    content: "Kandidaten die ingeschreven zijn maar nog geen CV hebben uitgewisseld. Zo zie je in één keer wie je moet rappelleren." },
  { target: '[data-tour="kandidaat-tabel"]',
    title: "De lijst",
    content: "Klik op een rij om de volledige kandidaat te openen. De badge-kleuren laten direct de status zien: blauw = nieuw, groen = in proces, lichtblauw = geplaatst, etc." },
  { target: "body", placement: "center", title: "Tips",
    content: "Gebruik het Kanban-bord (menu links) om kandidaten te verslepen tussen pipeline-fases. De Agenda toont gesprekken en eerste werkdagen." },
];

// =========================================================
// KANDIDAAT-DETAIL
// =========================================================
export const TOUR_KANDIDAAT_DETAIL: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom op het kandidaat-profiel",
    content: "Alles over deze kandidaat staat hier: persoonlijk, CV, voorstellen, plaatsing en geschiedenis." },
  { target: "body", placement: "center", title: "Header & score",
    content: "Bovenaan zie je naam, contact en de AI-score (0-100). Groen = sterke match, geel = twijfel, rood = aandacht." },
  { target: "body", placement: "center", title: "Status & pipeline-fase",
    content: "Pas de status en de pipeline-fase aan. Sommige overgangen sturen automatisch een mail naar de kandidaat (bv. bij 'Voorgesteld' of 'Geplaatst')." },
  { target: "body", placement: "center", title: "CV uploaden",
    content: "Upload het CV als PDF. Daarna kun je 'CV laten lezen door AI' klikken om alle CV-velden automatisch te vullen." },
  { target: "body", placement: "center", title: "Interne intake (recruiter/admin)",
    content: "Tijdens stap 'Interne intake' verschijnt een uitgebreid formulier. Alle AI-gevulde velden zijn bewerkbaar. Verzenden genereert automatisch een profielschets in 3e persoon — die kun je daarna goedkeuren of aanpassen." },
  { target: "body", placement: "center", title: "Voorstellen",
    content: "Hier verstuur je voorstellen naar opdrachtgevers en zie je live status per voorstel: verzonden, geopend, akkoord of afgewezen." },
  { target: "body", placement: "center", title: "Bellijsten",
    content: "Upload Jobdigger-Excel-bestanden. Zodra opgeslagen schuift de kandidaat door naar 'In proces' en krijgt een mail dat we gestart zijn." },
  { target: "body", placement: "center", title: "Plaatsing",
    content: "Zodra 'Geplaatst' is gekozen vul je de plaatsings-modal in (basis, tarief, startdatum). Backoffice krijgt automatisch een mail." },
  { target: "body", placement: "center", title: "Tijdlijn",
    content: "Onderaan staat de volledige audit-trail: elk event (voorstel verstuurd, reminder, kennismaking, plaatsing) chronologisch." },
];

// =========================================================
// KANBAN
// =========================================================
export const TOUR_KANBAN: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom op het Kanban-bord",
    content: "Dit bord toont alle kandidaten verdeeld over 9 pipeline-fases. We lopen ze door." },
  { target: '[data-tour="kanban-board"]',
    title: "Slepen = stap wijzigen",
    content: "Pak een kandidaat-kaart en sleep 'm naar een andere kolom. De status wordt direct opgeslagen en bij sommige overgangen krijgt de kandidaat automatisch een mail." },
  { target: '[data-tour="kol-interne_intake"]',
    title: "1. Interne intake",
    content: "Nieuwe kandidaat — recruiter/admin vult eerst de intake in en keurt de profielschets goed." },
  { target: '[data-tour="kol-in_afwachting_cv"]',
    title: "2. In afwachting van CV",
    content: "Intake afgerond maar CV ontbreekt. Cron stuurt automatisch herinneringen na een paar dagen." },
  { target: '[data-tour="kol-in_wachtrij"]',
    title: "3. In wachtrij",
    content: "CV ontvangen, wacht op een vrije setter. Zodra er capaciteit is wordt 'ie automatisch toegewezen." },
  { target: '[data-tour="kol-bij_setter"]',
    title: "4. Bij setter",
    content: "Een setter is toegewezen en begint met bellen/zoeken." },
  { target: '[data-tour="kol-in_proces"]',
    title: "5. In proces",
    content: "Setter heeft een bellijst opgeslagen. Kandidaat krijgt automatisch een mail dat we gestart zijn met zoeken." },
  { target: '[data-tour="kol-voorgesteld_opdrachtgever"]',
    title: "6. Voorgesteld",
    content: "Voorstel verstuurd naar opdrachtgever. Kandidaat krijgt mail (zonder bedrijfsnaam) dat hij is voorgesteld." },
  { target: '[data-tour="kol-1e_gesprek"]',
    title: "7. 1e gesprek",
    content: "Afspraak ingepland. Kandidaat krijgt afspraakbevestiging met datum, contactpersoon en locatie." },
  { target: '[data-tour="kol-2e_gesprek"]',
    title: "8. 2e gesprek",
    content: "Door naar de 2e ronde — kandidaat krijgt 'succes'-mail." },
  { target: '[data-tour="kol-geplaatst"]',
    title: "Geplaatst!",
    content: "Eindstation: deal rond. Vul de plaatsings-modal in (basis, tarief, startdatum) — backoffice krijgt automatisch een mail." },
  { target: '[data-tour="kol-afgewezen"]',
    title: "Afgewezen",
    content: "Niet door. Kandidaat krijgt afwijzings-mail. Reden komt in de notitie als audit-trail." },
];

// =========================================================
// AGENDA
// =========================================================
export const TOUR_AGENDA: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom bij de Agenda",
    content: "Alles wat ingepland staat op één plek: gesprekken, eerste werkdagen en team-events." },
  { target: "body", placement: "center", title: "Items per dag",
    content: "Per dag gegroepeerd. Tijdblok links, type-label rechts. Klik door op een gesprek om de kandidaat te openen." },
  { target: "body", placement: "center", title: "Types in de agenda",
    content: "Goud = 1e gesprek · Oranje = 2e gesprek · Groen = eerste werkdag · Paars = team-event. De kleuren zijn herkenbaar in de hele app." },
  { target: "body", placement: "center", title: "Team-afspraak (admin)",
    content: "Alleen admins kunnen een team-event aanmaken met optionele Google Meet link — alle team-leden zien 'm in hun agenda." },
  { target: "body", placement: "center", title: "Reminder 30 min vooraf",
    content: "Voor elk item krijg je 30 min van tevoren een notificatie met pieptoon — zo mis je nooit een afspraak." },
  { target: "body", placement: "center", title: "Filter per rol",
    content: "Admin ziet alles van het bureau. Setter ziet alleen eigen voorstellen en plaatsingen. Recruiter ziet alle voorstellen + eigen plaatsingen." },
];

// =========================================================
// COACHING
// =========================================================
export const TOUR_COACHING: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom bij Coaching",
    content: "Hier komt alles rondom jouw performance samen: doelen, records, EOD-rapport en je positie op de leaderboard." },
  { target: '[data-tour="coaching-titel"]',
    title: "Twee weergaves",
    content: "Setters zien hun eigen blokken. Admin en coach krijgen extra filters en het overzicht van alle setters." },
  { target: '[data-tour="doelen-kaart"]',
    title: "Mijn doelen",
    content: "Hier staan je targets per dag/week/maand met live voortgang. De balk wordt groen zodra je het doel haalt." },
  { target: '[data-tour="doelen-aanpassen"]',
    title: "Doelen aanpassen",
    content: "Klik hier om je targets bij te stellen. Begin laag en verhoog ze stapsgewijs zodra je ze haalt." },
  { target: '[data-tour="records-kaart"]',
    title: "Persoonlijke records",
    content: "Je beste prestaties ooit. Verbreek ze en zie je records groeien: bel-record, omzet-maand, langste streak doel behaald." },
  { target: '[data-tour="eod-form"]',
    title: "EOD-rapport",
    content: "Elke werkdag verplicht in te vullen. We lopen de drie blokken door." },
  { target: '[data-tour="eod-doelen"]',
    title: "1. Doelen",
    content: "Schrijf je doel van vandaag en morgen. Markeer of je het van vandaag behaald hebt — als 'nee' krijgt de coach automatisch een melding." },
  { target: '[data-tour="eod-activiteit"]',
    title: "2. Activiteit",
    content: "Vijf cijfers: calls, voicemails, voorgesteld, afspraken, plaatsingen. Hierop wordt je leaderboard-positie bepaald." },
  { target: '[data-tour="eod-reflectie"]',
    title: "3. Reflectie",
    content: "Korte reflectie: grootste obstakel, meest voorkomende reden van afwijzing, energie 1-5 en wat je morgen anders doet." },
  { target: '[data-tour="leaderboard"]',
    title: "Top 10 leaderboard",
    content: "Wie loopt voorop? Wissel tussen week/maand/jaar. Je eigen rij wordt geel-gemarkeerd zodat je 'm direct vindt." },
  { target: '[data-tour="coaching-knop"]',
    title: "1-op-1 met Pepijn",
    content: "Vastgelopen? Vraag een 1-op-1 aan — Pepijn (of de coach in jouw bureau) krijgt direct een melding en plant het in." },
];

// =========================================================
// OPDRACHTGEVERS (CRM)
// =========================================================
export const TOUR_OPDRACHTGEVERS: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom bij het CRM",
    content: "Je relaties op één plek: leads, prospects, klanten en ex-klanten." },
  { target: "body", placement: "center", title: "Nieuwe relatie",
    content: "Boven aan zit een knop om handmatig een opdrachtgever toe te voegen. Het systeem voegt ze ook automatisch toe vanuit bellijst-items uit Jobdigger." },
  { target: "body", placement: "center", title: "Status-kleuren",
    content: "Blauw = lead · Geel = prospect · Groen = klant · Rood = ex-klant. Werk de status bij naarmate het contact vordert." },
  { target: "body", placement: "center", title: "Klik door",
    content: "Klik op een naam voor de contactpersonen, bellijst-historie en alle voorstellen die voor dit bedrijf zijn verstuurd." },
];

// =========================================================
// VOORSTELLEN
// =========================================================
export const TOUR_VOORSTELLEN: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom bij Voorstellen",
    content: "Alle voorstellen die je naar opdrachtgevers hebt verstuurd, met live status." },
  { target: "body", placement: "center", title: "Filter op status",
    content: "Wachten op reactie · Akkoord · Afgewezen · Verlopen. Klik op een filter om alleen die voorstellen te zien — handig voor follow-up." },
  { target: "body", placement: "center", title: "Per voorstel",
    content: "Elke rij toont kandidaat, opdrachtgever, datum en status. Het mail-icoon geeft aan of het voorstel door de opdrachtgever is geopend." },
  { target: "body", placement: "center", title: "Klik door",
    content: "Klik op een rij om de details te zien — verzendtijd, reminders, akkoord-/afwijzings-datum en de hele gesprekgeschiedenis." },
];

// =========================================================
// SETTERS (users)
// =========================================================
export const TOUR_SETTERS: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom bij Users & Setters",
    content: "Beheer wie toegang heeft tot het bureau en wijs rollen toe: admin, recruiter of setter." },
  { target: "body", placement: "center", title: "Nieuwe user",
    content: "Klap 'Nieuwe user toevoegen' open om een account aan te maken. Vul direct rol, telefoon, mailbox en optioneel Voys-nummer in." },
  { target: "body", placement: "center", title: "Coach-vlag",
    content: "In de tabel zie je per user een 'Coach'-badge. Klik om iemand als coach aan te wijzen — diegene krijgt voortaan alle 1-op-1 aanvragen en 'doel niet behaald'-meldingen. Per bureau één coach." },
  { target: "body", placement: "center", title: "Voys-nummer",
    content: "Klik op het Voys-nummer in een rij om het inline te bewerken — handig voor click-to-dial." },
];

// =========================================================
// JOBDIGGER
// =========================================================
export const TOUR_JOBDIGGER: TourStap[] = [
  { target: "body", placement: "center", title: "Welkom bij Jobdigger",
    content: "Hier zoek je vacatures en upload je bellijsten per kandidaat." },
  { target: "body", placement: "center", title: "Tip: brede zoekopdracht",
    content: "Vul de zoekopdracht in Jobdigger zo ruim mogelijk in. Hoe groter je bellijst, hoe meer kans op een match." },
  { target: "body", placement: "center", title: "1. Open Jobdigger",
    content: "Klik op de knop om Jobdigger te openen in een nieuwe tab. Zoek je vacatures, exporteer als Excel." },
  { target: "body", placement: "center", title: "2. Upload de Excel",
    content: "Sleep het bestand naar de drop-zone of klik om te kiezen. Selecteer de juiste kandidaat — de bellijst wordt opgeslagen en de kandidaat schuift automatisch door naar 'In proces' (met mail naar de kandidaat)." },
];
