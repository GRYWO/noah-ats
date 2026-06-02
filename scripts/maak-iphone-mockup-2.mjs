// Kanban + Kandidaat-detail mockups voor iOS
import sharp from "sharp";

const W = 1170, H = 2532;

function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="paars" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f1f5c"/>
      <stop offset="100%" stop-color="#333399"/>
    </linearGradient>
    <filter id="shad" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="15" flood-color="#000" flood-opacity="0.08"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#000"/>
  <rect x="30" y="30" width="${W-60}" height="${H-60}" rx="100" fill="#f5f5f7"/>
  <rect x="${W/2-180}" y="90" width="360" height="105" rx="55" fill="#000"/>
  <text x="120" y="170" font-family="-apple-system" font-size="40" font-weight="600" fill="#000">9:41</text>
  <g transform="translate(${W-280}, 130)">
    <rect x="0" y="35" width="8" height="12" rx="2" fill="#000"/>
    <rect x="14" y="28" width="8" height="19" rx="2" fill="#000"/>
    <rect x="28" y="20" width="8" height="27" rx="2" fill="#000"/>
    <rect x="42" y="10" width="8" height="37" rx="2" fill="#000"/>
    <rect x="150" y="20" width="80" height="36" rx="8" stroke="#000" stroke-width="3" fill="none"/>
    <rect x="156" y="26" width="60" height="24" rx="4" fill="#000"/>
  </g>
  ${inner}
  <rect x="${W/2-150}" y="${H-50}" width="300" height="8" rx="4" fill="#000"/>
</svg>`;
}

// ============================================================
// MOCKUP 1: KANBAN
// ============================================================
const kanban = frame(`
  <!-- Header -->
  <rect x="30" y="220" width="${W-60}" height="200" fill="url(#paars)"/>
  <text x="80" y="340" font-family="-apple-system" font-size="64" font-weight="800" fill="#fff">Kanban</text>
  <text x="80" y="395" font-family="-apple-system" font-size="32" fill="#fff" opacity="0.8">12 kandidaten in proces</text>
  <!-- Search icoon -->
  <circle cx="${W-130}" cy="350" r="38" fill="#fff" opacity="0.15"/>
  <circle cx="${W-145}" cy="345" r="18" stroke="#fff" stroke-width="4" fill="none"/>
  <line x1="${W-133}" y1="357" x2="${W-115}" y2="375" stroke="#fff" stroke-width="4"/>

  <!-- Kolom-tabs -->
  <g transform="translate(80, 480)">
    <rect x="0" y="0" width="200" height="60" rx="30" fill="#333399"/>
    <text x="100" y="40" text-anchor="middle" font-family="-apple-system" font-size="28" font-weight="600" fill="#fff">Nieuw (4)</text>
    <text x="280" y="40" font-family="-apple-system" font-size="28" font-weight="500" fill="#666">Intake (3)</text>
    <text x="520" y="40" font-family="-apple-system" font-size="28" font-weight="500" fill="#666">Voorstel (3)</text>
    <text x="780" y="40" font-family="-apple-system" font-size="28" font-weight="500" fill="#666">Plaatsing</text>
  </g>

  <!-- Kandidaat-cards -->
  <g transform="translate(80, 600)">
    <!-- Card 1 -->
    <rect width="${W-160}" height="240" rx="32" fill="#fff" filter="url(#shad)"/>
    <circle cx="80" cy="80" r="44" fill="#3b82f6"/>
    <text x="80" y="95" text-anchor="middle" font-family="-apple-system" font-size="40" font-weight="700" fill="#fff">JV</text>
    <text x="160" y="75" font-family="-apple-system" font-size="38" font-weight="600" fill="#000">Jan Vermeer</text>
    <text x="160" y="120" font-family="-apple-system" font-size="28" fill="#666">Backend developer · Eindhoven</text>
    <!-- Tags -->
    <rect x="160" y="145" width="140" height="42" rx="21" fill="#ddd6fe"/>
    <text x="230" y="172" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="600" fill="#5b21b6">€ 80/u</text>
    <rect x="310" y="145" width="160" height="42" rx="21" fill="#dcfce7"/>
    <text x="390" y="172" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="600" fill="#15803d">Per direct</text>
    <!-- Tijd -->
    <text x="160" y="220" font-family="-apple-system" font-size="24" fill="#999">Toegevoegd 2u geleden</text>
    <!-- Status-dot -->
    <circle cx="${W-220}" cy="80" r="10" fill="#f59e0b"/>
  </g>

  <g transform="translate(80, 870)">
    <rect width="${W-160}" height="240" rx="32" fill="#fff" filter="url(#shad)"/>
    <circle cx="80" cy="80" r="44" fill="#f59e0b"/>
    <text x="80" y="95" text-anchor="middle" font-family="-apple-system" font-size="40" font-weight="700" fill="#fff">SK</text>
    <text x="160" y="75" font-family="-apple-system" font-size="38" font-weight="600" fill="#000">Sanne Klein</text>
    <text x="160" y="120" font-family="-apple-system" font-size="28" fill="#666">UX designer · Utrecht</text>
    <rect x="160" y="145" width="140" height="42" rx="21" fill="#ddd6fe"/>
    <text x="230" y="172" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="600" fill="#5b21b6">€ 65/u</text>
    <rect x="310" y="145" width="180" height="42" rx="21" fill="#fef3c7"/>
    <text x="400" y="172" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="600" fill="#92400e">Vanaf juli</text>
    <text x="160" y="220" font-family="-apple-system" font-size="24" fill="#999">Toegevoegd 1d geleden</text>
    <circle cx="${W-220}" cy="80" r="10" fill="#10b981"/>
  </g>

  <g transform="translate(80, 1140)">
    <rect width="${W-160}" height="240" rx="32" fill="#fff" filter="url(#shad)"/>
    <circle cx="80" cy="80" r="44" fill="#a855f7"/>
    <text x="80" y="95" text-anchor="middle" font-family="-apple-system" font-size="40" font-weight="700" fill="#fff">PD</text>
    <text x="160" y="75" font-family="-apple-system" font-size="38" font-weight="600" fill="#000">Pieter de Boer</text>
    <text x="160" y="120" font-family="-apple-system" font-size="28" fill="#666">DevOps engineer · Den Bosch</text>
    <rect x="160" y="145" width="140" height="42" rx="21" fill="#ddd6fe"/>
    <text x="230" y="172" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="600" fill="#5b21b6">€ 95/u</text>
    <rect x="310" y="145" width="170" height="42" rx="21" fill="#fee2e2"/>
    <text x="395" y="172" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="600" fill="#991b1b">Spoed</text>
    <text x="160" y="220" font-family="-apple-system" font-size="24" fill="#999">Toegevoegd 3d geleden</text>
    <circle cx="${W-220}" cy="80" r="10" fill="#ef4444"/>
  </g>

  <g transform="translate(80, 1410)">
    <rect width="${W-160}" height="240" rx="32" fill="#fff" filter="url(#shad)"/>
    <circle cx="80" cy="80" r="44" fill="#10b981"/>
    <text x="80" y="95" text-anchor="middle" font-family="-apple-system" font-size="40" font-weight="700" fill="#fff">MK</text>
    <text x="160" y="75" font-family="-apple-system" font-size="38" font-weight="600" fill="#000">Maartje Kuijpers</text>
    <text x="160" y="120" font-family="-apple-system" font-size="28" fill="#666">Recruiter · Amsterdam</text>
    <rect x="160" y="145" width="140" height="42" rx="21" fill="#ddd6fe"/>
    <text x="230" y="172" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="600" fill="#5b21b6">€ 70/u</text>
    <text x="160" y="220" font-family="-apple-system" font-size="24" fill="#999">Toegevoegd 5d geleden</text>
    <circle cx="${W-220}" cy="80" r="10" fill="#3b82f6"/>
  </g>

  <!-- FAB (floating action button) -->
  <circle cx="${W-150}" cy="${H-380}" r="80" fill="#333399" filter="url(#shad)"/>
  <text x="${W-150}" y="${H-355}" text-anchor="middle" font-family="-apple-system" font-size="100" fill="#fff">+</text>

  <!-- Tab bar -->
  <rect x="30" y="${H-260}" width="${W-60}" height="230" fill="#fff" filter="url(#shad)"/>
  <line x1="60" y1="${H-260}" x2="${W-60}" y2="${H-260}" stroke="#e5e5e5" stroke-width="2"/>
  <g transform="translate(0, ${H-220})">
    <g transform="translate(120, 0)">
      <rect x="-15" y="0" width="50" height="32" rx="6" fill="none" stroke="#999" stroke-width="4"/>
      <path d="M -20 0 L 10 -22 L 40 0" stroke="#999" stroke-width="4" fill="none"/>
      <text x="10" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Home</text>
    </g>
    <g transform="translate(340, 0)">
      <circle cx="15" cy="10" r="20" fill="none" stroke="#999" stroke-width="4"/>
      <path d="M -10 60 Q 15 30 40 60" stroke="#999" stroke-width="4" fill="none"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Kandidaten</text>
    </g>
    <g transform="translate(580, 0)">
      <rect x="-15" y="-5" width="14" height="40" rx="3" fill="#333399"/>
      <rect x="5" y="-5" width="14" height="25" rx="3" fill="#333399"/>
      <rect x="25" y="-5" width="14" height="35" rx="3" fill="#333399"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="600" fill="#333399">Kanban</text>
    </g>
    <g transform="translate(820, 0)">
      <rect x="-15" y="0" width="50" height="36" rx="4" fill="none" stroke="#999" stroke-width="4"/>
      <path d="M -15 0 L 10 22 L 35 0" stroke="#999" stroke-width="4" fill="none"/>
      <text x="10" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Inbox</text>
    </g>
    <g transform="translate(1020, 0)">
      <circle cx="15" cy="15" r="22" fill="none" stroke="#999" stroke-width="4"/>
      <circle cx="15" cy="8" r="8" fill="#999"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Mij</text>
    </g>
  </g>
`);

// ============================================================
// MOCKUP 2: KANDIDAAT DETAIL
// ============================================================
const kandidaat = frame(`
  <!-- Header met grote avatar -->
  <rect x="30" y="220" width="${W-60}" height="600" fill="url(#paars)"/>
  <!-- Terug-knop -->
  <text x="80" y="320" font-family="-apple-system" font-size="56" fill="#fff">‹</text>
  <text x="125" y="320" font-family="-apple-system" font-size="32" font-weight="500" fill="#fff" opacity="0.85">Kanban</text>
  <!-- Bel-icoon rechts -->
  <circle cx="${W-130}" cy="305" r="38" fill="#fff" opacity="0.15"/>
  <text x="${W-130}" y="330" text-anchor="middle" font-family="-apple-system" font-size="40" fill="#fff">⋯</text>

  <!-- Avatar -->
  <circle cx="${W/2}" cy="500" r="130" fill="#ffd84d"/>
  <text x="${W/2}" y="540" text-anchor="middle" font-family="-apple-system" font-size="110" font-weight="800" fill="#333399">JV</text>

  <!-- Naam + functie -->
  <text x="${W/2}" y="700" text-anchor="middle" font-family="-apple-system" font-size="60" font-weight="800" fill="#fff">Jan Vermeer</text>
  <text x="${W/2}" y="760" text-anchor="middle" font-family="-apple-system" font-size="34" fill="#fff" opacity="0.85">Backend developer · Eindhoven</text>

  <!-- Snelle acties -->
  <g transform="translate(0, 870)">
    <g transform="translate(150, 0)">
      <circle cx="60" cy="60" r="60" fill="#fff" filter="url(#shad)"/>
      <text x="60" y="80" text-anchor="middle" font-family="-apple-system" font-size="48">📞</text>
      <text x="60" y="180" text-anchor="middle" font-family="-apple-system" font-size="26" font-weight="600" fill="#000">Bellen</text>
    </g>
    <g transform="translate(420, 0)">
      <circle cx="60" cy="60" r="60" fill="#fff" filter="url(#shad)"/>
      <text x="60" y="80" text-anchor="middle" font-family="-apple-system" font-size="48">✉</text>
      <text x="60" y="180" text-anchor="middle" font-family="-apple-system" font-size="26" font-weight="600" fill="#000">Mailen</text>
    </g>
    <g transform="translate(690, 0)">
      <circle cx="60" cy="60" r="60" fill="#fff" filter="url(#shad)"/>
      <text x="60" y="80" text-anchor="middle" font-family="-apple-system" font-size="48">💬</text>
      <text x="60" y="180" text-anchor="middle" font-family="-apple-system" font-size="26" font-weight="600" fill="#000">App</text>
    </g>
    <g transform="translate(960, 0)">
      <circle cx="60" cy="60" r="60" fill="#333399" filter="url(#shad)"/>
      <text x="60" y="80" text-anchor="middle" font-family="-apple-system" font-size="50" fill="#fff">📤</text>
      <text x="60" y="180" text-anchor="middle" font-family="-apple-system" font-size="26" font-weight="600" fill="#333399">Voorstel</text>
    </g>
  </g>

  <!-- Info-card -->
  <g transform="translate(80, 1130)">
    <rect width="${W-160}" height="500" rx="32" fill="#fff" filter="url(#shad)"/>

    <text x="50" y="80" font-family="-apple-system" font-size="32" font-weight="700" fill="#000">Profiel</text>

    <!-- Rijen -->
    <text x="50" y="160" font-family="-apple-system" font-size="28" fill="#666">Functie</text>
    <text x="${W-210}" y="160" text-anchor="end" font-family="-apple-system" font-size="28" font-weight="600" fill="#000">Backend developer</text>
    <line x1="50" y1="195" x2="${W-210}" y2="195" stroke="#f0f0f0" stroke-width="2"/>

    <text x="50" y="245" font-family="-apple-system" font-size="28" fill="#666">Tarief</text>
    <text x="${W-210}" y="245" text-anchor="end" font-family="-apple-system" font-size="28" font-weight="600" fill="#000">€ 80,00/u</text>
    <line x1="50" y1="280" x2="${W-210}" y2="280" stroke="#f0f0f0" stroke-width="2"/>

    <text x="50" y="330" font-family="-apple-system" font-size="28" fill="#666">Beschikbaar</text>
    <text x="${W-210}" y="330" text-anchor="end" font-family="-apple-system" font-size="28" font-weight="600" fill="#10b981">Per direct</text>
    <line x1="50" y1="365" x2="${W-210}" y2="365" stroke="#f0f0f0" stroke-width="2"/>

    <text x="50" y="415" font-family="-apple-system" font-size="28" fill="#666">Bron</text>
    <text x="${W-210}" y="415" text-anchor="end" font-family="-apple-system" font-size="28" font-weight="600" fill="#000">Jobdigger</text>
  </g>

  <!-- Tijdlijn -->
  <text x="80" y="1730" font-family="-apple-system" font-size="44" font-weight="700" fill="#000">Tijdlijn</text>

  <g transform="translate(80, 1780)">
    <rect width="${W-160}" height="380" rx="32" fill="#fff" filter="url(#shad)"/>

    <!-- Item 1 -->
    <circle cx="60" cy="80" r="16" fill="#10b981"/>
    <line x1="60" y1="100" x2="60" y2="180" stroke="#e5e5e5" stroke-width="3"/>
    <text x="110" y="75" font-family="-apple-system" font-size="30" font-weight="600" fill="#000">Intake voltooid</text>
    <text x="110" y="115" font-family="-apple-system" font-size="24" fill="#666">Yorith · vandaag 14:23</text>

    <!-- Item 2 -->
    <circle cx="60" cy="220" r="16" fill="#3b82f6"/>
    <line x1="60" y1="240" x2="60" y2="320" stroke="#e5e5e5" stroke-width="3"/>
    <text x="110" y="215" font-family="-apple-system" font-size="30" font-weight="600" fill="#000">Toegevoegd aan Kanban</text>
    <text x="110" y="255" font-family="-apple-system" font-size="24" fill="#666">Wouter · gisteren 10:12</text>

    <!-- Item 3 -->
    <circle cx="60" cy="350" r="16" fill="#a855f7"/>
    <text x="110" y="345" font-family="-apple-system" font-size="30" font-weight="600" fill="#000">CV geüpload</text>
    <text x="110" y="385" font-family="-apple-system" font-size="24" fill="#666">via Jobdigger · 2d geleden</text>
  </g>

  <!-- Tab bar -->
  <rect x="30" y="${H-260}" width="${W-60}" height="230" fill="#fff" filter="url(#shad)"/>
  <line x1="60" y1="${H-260}" x2="${W-60}" y2="${H-260}" stroke="#e5e5e5" stroke-width="2"/>
  <g transform="translate(0, ${H-220})">
    <g transform="translate(120, 0)">
      <rect x="-15" y="0" width="50" height="32" rx="6" fill="none" stroke="#999" stroke-width="4"/>
      <path d="M -20 0 L 10 -22 L 40 0" stroke="#999" stroke-width="4" fill="none"/>
      <text x="10" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Home</text>
    </g>
    <g transform="translate(340, 0)">
      <circle cx="15" cy="10" r="20" fill="#333399"/>
      <path d="M -10 60 Q 15 30 40 60" stroke="#333399" stroke-width="4" fill="#333399"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="600" fill="#333399">Kandidaten</text>
    </g>
    <g transform="translate(580, 0)">
      <rect x="-15" y="-5" width="14" height="40" rx="3" fill="none" stroke="#999" stroke-width="4"/>
      <rect x="5" y="-5" width="14" height="25" rx="3" fill="none" stroke="#999" stroke-width="4"/>
      <rect x="25" y="-5" width="14" height="35" rx="3" fill="none" stroke="#999" stroke-width="4"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Kanban</text>
    </g>
    <g transform="translate(820, 0)">
      <rect x="-15" y="0" width="50" height="36" rx="4" fill="none" stroke="#999" stroke-width="4"/>
      <path d="M -15 0 L 10 22 L 35 0" stroke="#999" stroke-width="4" fill="none"/>
      <text x="10" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Inbox</text>
    </g>
    <g transform="translate(1020, 0)">
      <circle cx="15" cy="15" r="22" fill="none" stroke="#999" stroke-width="4"/>
      <circle cx="15" cy="8" r="8" fill="#999"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Mij</text>
    </g>
  </g>
`);

await sharp(Buffer.from(kanban)).resize(750).png().toFile("/Users/macbook/Desktop/noah-iphone-kanban.png");
console.log("→ /Users/macbook/Desktop/noah-iphone-kanban.png");

await sharp(Buffer.from(kandidaat)).resize(750).png().toFile("/Users/macbook/Desktop/noah-iphone-kandidaat.png");
console.log("→ /Users/macbook/Desktop/noah-iphone-kandidaat.png");
