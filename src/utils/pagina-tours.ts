import type { TourStap } from "@/components/PaginaTour";

// ---------- Dashboard ----------
export const TOUR_DASHBOARD: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Dashboard",
    content: "Welkom op het dashboard. Hier zie je in één oogopslag hoe het bureau presteert: pipeline, voorstellen en setter-performance.",
  },
  {
    target: '[data-tour="kpi-cards"]',
    title: "Live KPI's",
    content: "Vier cijfers die je elke ochtend even checkt: openstaande voorstellen, kennismakingen, plaatsingen en omzet.",
  },
  {
    target: '[data-tour="pipeline-bar"]',
    title: "Pipeline-visualisatie",
    content: "De volledige funnel: van nieuwe sollicitatie tot geplaatst. Klik op een fase om alleen die kandidaten te tonen.",
  },
];

// ---------- Kandidaten lijst ----------
export const TOUR_KANDIDATEN: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Kandidaten",
    content: "Het hart van Noah. Hier staan al je kandidaten. Klik op een naam om de volledige info te zien.",
  },
  {
    target: '[data-tour="kandidaat-nieuw"]',
    title: "Nieuwe kandidaat",
    content: "Een nieuwe inschrijving? Klik hier om de kandidaat handmatig toe te voegen. Een CV kun je daarna uploaden zodat de AI alles automatisch invult.",
  },
  {
    target: '[data-tour="kandidaat-filters"]',
    title: "Filters",
    content: "Zoek snel op status, score of fase. De filters blijven actief tussen kandidaten — handig om door je shortlist te lopen.",
  },
];

// ---------- Kandidaat detail ----------
export const TOUR_KANDIDAAT_DETAIL: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Kandidaat-profiel",
    content: "Alles over deze kandidaat staat hier. Tijdens 'Interne intake' vul je de gegevens aan; daarna start de pipeline.",
  },
  {
    target: '[data-tour="kandidaat-status"]',
    title: "Status & pipeline",
    content: "Pas hier de pipeline-fase aan. Bepaalde overgangen sturen automatisch een mail naar de kandidaat (bv. bevestiging 1e gesprek).",
  },
  {
    target: '[data-tour="kandidaat-cv"]',
    title: "CV laten lezen",
    content: "Upload het CV en laat de AI alle velden vooraf invullen. Je kunt ze daarna aanpassen voordat je 'Verzenden' klikt.",
  },
];

// ---------- Kanban ----------
export const TOUR_KANBAN: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Kanban-bord",
    content: "Sleep kandidaten tussen kolommen om de pipeline-fase te wijzigen. Sommige overgangen triggeren automatisch een mail (bv. naar 'Voorgesteld').",
  },
];

// ---------- Agenda ----------
export const TOUR_AGENDA: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Agenda",
    content: "Alles wat ingepland staat: 1e gesprekken, 2e gesprekken, eerste werkdagen en team-afspraken. Setters/recruiters zien alleen wat aan hun eigen kandidaten hangt.",
  },
  {
    target: '[data-tour="agenda-toevoegen"]',
    title: "Team-afspraak (admin)",
    content: "Als admin kun je hier een team-event toevoegen met optionele Google Meet link.",
  },
];

// ---------- Coaching ----------
export const TOUR_COACHING: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Coaching",
    content: "Hier vul je je dagelijkse EOD-rapport in en zie je je doelen, records en de leaderboard van het bureau.",
  },
  {
    target: '[data-tour="doelen-kaart"]',
    title: "Mijn doelen",
    content: "Zet hier je eigen targets en zie live je voortgang. Probeer ze stapsgewijs op te schroeven zodra je ze haalt.",
  },
  {
    target: '[data-tour="records-kaart"]',
    title: "Mijn records",
    content: "Je beste prestaties ooit — verbreek ze!",
  },
  {
    target: '[data-tour="eod-form"]',
    title: "EOD-rapport",
    content: "Elke werkdag (verplicht voor setters) vul je hier 12 korte vragen in. Niet behaald? De coach krijgt automatisch een melding.",
  },
];

// ---------- Opdrachtgevers (CRM) ----------
export const TOUR_OPDRACHTGEVERS: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "CRM",
    content: "Je relatie-portefeuille: leads, prospects en klanten. Klik door om de bellijst-historie en contactpersonen te zien.",
  },
];

// ---------- Inbox ----------
export const TOUR_INBOX: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "E-mail",
    content: "Je gekoppelde mailboxen op één plek. Vlaggen, archiveren en zoeken — net als in je gewone mail.",
  },
];

// ---------- Voorstellen overzicht ----------
export const TOUR_VOORSTELLEN: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Voorstellen",
    content: "Alle lopende voorstellen met filter op status. Klik door voor de details en voortgang per voorstel.",
  },
];

// ---------- Setters / users beheer ----------
export const TOUR_SETTERS: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Users & coach",
    content: "Beheer wie toegang heeft tot het bureau. Zet hier ook de coach-vlag bij de juiste persoon — die ontvangt alle coaching-meldingen.",
  },
];

// ---------- Jobdigger ----------
export const TOUR_JOBDIGGER: TourStap[] = [
  {
    target: "body", placement: "center",
    title: "Jobdigger",
    content: "Vul een ruime zoekopdracht in zodat de bellijst groot wordt. Upload daarna de Excel onder de juiste kandidaat — zodra je 'm opslaat schuift de kandidaat door naar 'In proces' en krijgt 'ie automatisch een mail.",
  },
];
