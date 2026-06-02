// iPhone mockup van Noah ATS — laat zien hoe app eruit zou zien
import sharp from "sharp";

const W = 1170;  // iPhone 15 Pro
const H = 2532;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="topBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f1f5c"/>
      <stop offset="100%" stop-color="#333399"/>
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#000" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Telefoon-rand (zwart) -->
  <rect width="${W}" height="${H}" fill="#000"/>
  <!-- Scherm -->
  <rect x="30" y="30" width="${W-60}" height="${H-60}" rx="100" fill="#f5f5f7"/>

  <!-- Dynamic island -->
  <rect x="${W/2-180}" y="90" width="360" height="105" rx="55" fill="#000"/>

  <!-- Status bar -->
  <text x="120" y="170" font-family="-apple-system, SF Pro Display" font-size="40" font-weight="600" fill="#000">9:41</text>
  <g transform="translate(${W-280}, 130)">
    <!-- Signaal -->
    <rect x="0" y="35" width="8" height="12" rx="2" fill="#000"/>
    <rect x="14" y="28" width="8" height="19" rx="2" fill="#000"/>
    <rect x="28" y="20" width="8" height="27" rx="2" fill="#000"/>
    <rect x="42" y="10" width="8" height="37" rx="2" fill="#000"/>
    <!-- Wifi -->
    <path d="M 80 35 Q 100 20 120 35" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M 90 28 Q 100 22 110 28" stroke="#000" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="40" r="4" fill="#000"/>
    <!-- Batterij -->
    <rect x="150" y="20" width="80" height="36" rx="8" stroke="#000" stroke-width="3" fill="none"/>
    <rect x="156" y="26" width="60" height="24" rx="4" fill="#000"/>
  </g>

  <!-- Header — paarse gradient -->
  <rect x="30" y="220" width="${W-60}" height="380" fill="url(#topBg)"/>

  <!-- Noah-logo + dot in header -->
  <text x="${W/2}" y="430" text-anchor="middle"
        font-family="-apple-system, SF Pro Display" font-weight="900"
        font-size="180" fill="#fff" letter-spacing="-8">noah</text>
  <circle cx="${W/2 + 280}" cy="430" r="22" fill="#ffd84d"/>

  <text x="${W/2}" y="510" text-anchor="middle"
        font-family="-apple-system" font-size="44" font-weight="500" fill="#ffffff" opacity="0.85">Welkom terug, Yorith</text>

  <!-- KPI cards rij -->
  <g transform="translate(80, 660)">
    <rect width="320" height="220" rx="32" fill="#fff" filter="url(#cardShadow)"/>
    <text x="40" y="80" font-family="-apple-system" font-size="32" font-weight="500" fill="#666">Actieve kandidaten</text>
    <text x="40" y="170" font-family="-apple-system" font-size="96" font-weight="800" fill="#333399">47</text>
  </g>
  <g transform="translate(440, 660)">
    <rect width="320" height="220" rx="32" fill="#fff" filter="url(#cardShadow)"/>
    <text x="40" y="80" font-family="-apple-system" font-size="32" font-weight="500" fill="#666">In voorstel</text>
    <text x="40" y="170" font-family="-apple-system" font-size="96" font-weight="800" fill="#333399">12</text>
  </g>
  <g transform="translate(800, 660)">
    <rect width="300" height="220" rx="32" fill="#fff" filter="url(#cardShadow)"/>
    <text x="40" y="80" font-family="-apple-system" font-size="32" font-weight="500" fill="#666">Plaatsingen</text>
    <text x="40" y="170" font-family="-apple-system" font-size="96" font-weight="800" fill="#10b981">8</text>
  </g>

  <!-- Sectie: Nieuwe activiteit -->
  <text x="80" y="1000" font-family="-apple-system" font-size="44" font-weight="700" fill="#000">Vandaag</text>

  <!-- Activiteit-card 1 -->
  <g transform="translate(80, 1050)">
    <rect width="${W-160}" height="160" rx="28" fill="#fff" filter="url(#cardShadow)"/>
    <circle cx="80" cy="80" r="40" fill="#10b981"/>
    <text x="80" y="93" text-anchor="middle" font-family="-apple-system" font-size="40" font-weight="700" fill="#fff">JV</text>
    <text x="160" y="75" font-family="-apple-system" font-size="36" font-weight="600" fill="#000">Jan Vermeer — geplaatst</text>
    <text x="160" y="125" font-family="-apple-system" font-size="30" font-weight="400" fill="#666">ABC Bouw · 11 min geleden</text>
  </g>

  <!-- Activiteit-card 2 -->
  <g transform="translate(80, 1240)">
    <rect width="${W-160}" height="160" rx="28" fill="#fff" filter="url(#cardShadow)"/>
    <circle cx="80" cy="80" r="40" fill="#3b82f6"/>
    <text x="80" y="93" text-anchor="middle" font-family="-apple-system" font-size="40" font-weight="700" fill="#fff">PD</text>
    <text x="160" y="75" font-family="-apple-system" font-size="36" font-weight="600" fill="#000">Pieter de Boer — voorstel verstuurd</text>
    <text x="160" y="125" font-family="-apple-system" font-size="30" font-weight="400" fill="#666">Heijmans · 34 min geleden</text>
  </g>

  <!-- Activiteit-card 3 -->
  <g transform="translate(80, 1430)">
    <rect width="${W-160}" height="160" rx="28" fill="#fff" filter="url(#cardShadow)"/>
    <circle cx="80" cy="80" r="40" fill="#f59e0b"/>
    <text x="80" y="93" text-anchor="middle" font-family="-apple-system" font-size="40" font-weight="700" fill="#fff">SK</text>
    <text x="160" y="75" font-family="-apple-system" font-size="36" font-weight="600" fill="#000">Sanne Klein — intake gepland</text>
    <text x="160" y="125" font-family="-apple-system" font-size="30" font-weight="400" fill="#666">vandaag 14:00 · 1u geleden</text>
  </g>

  <!-- Sectie: Snelle acties -->
  <text x="80" y="1700" font-family="-apple-system" font-size="44" font-weight="700" fill="#000">Snel</text>

  <g transform="translate(80, 1750)">
    <rect width="240" height="200" rx="28" fill="#333399" filter="url(#cardShadow)"/>
    <text x="120" y="100" text-anchor="middle" font-family="-apple-system" font-size="80">＋</text>
    <text x="120" y="155" text-anchor="middle" font-family="-apple-system" font-size="28" font-weight="600" fill="#fff">Kandidaat</text>
  </g>
  <g transform="translate(345, 1750)">
    <rect width="240" height="200" rx="28" fill="#fff" filter="url(#cardShadow)"/>
    <text x="120" y="100" text-anchor="middle" font-family="-apple-system" font-size="80">📞</text>
    <text x="120" y="155" text-anchor="middle" font-family="-apple-system" font-size="28" font-weight="600" fill="#000">Jobdigger</text>
  </g>
  <g transform="translate(610, 1750)">
    <rect width="240" height="200" rx="28" fill="#fff" filter="url(#cardShadow)"/>
    <text x="120" y="100" text-anchor="middle" font-family="-apple-system" font-size="80">✨</text>
    <text x="120" y="155" text-anchor="middle" font-family="-apple-system" font-size="28" font-weight="600" fill="#000">Robin</text>
  </g>
  <g transform="translate(875, 1750)">
    <rect width="225" height="200" rx="28" fill="#fff" filter="url(#cardShadow)"/>
    <text x="112" y="100" text-anchor="middle" font-family="-apple-system" font-size="80">📊</text>
    <text x="112" y="155" text-anchor="middle" font-family="-apple-system" font-size="28" font-weight="600" fill="#000">Kanban</text>
  </g>

  <!-- Tab bar (native iOS stijl) -->
  <rect x="30" y="${H-260}" width="${W-60}" height="230" fill="#fff" filter="url(#cardShadow)"/>
  <line x1="60" y1="${H-260}" x2="${W-60}" y2="${H-260}" stroke="#e5e5e5" stroke-width="2"/>

  <!-- Tab items -->
  <g transform="translate(0, ${H-220})">
    <!-- Home (actief) -->
    <g transform="translate(120, 0)">
      <rect x="-10" y="-15" width="50" height="50" rx="6" fill="#333399"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="600" fill="#333399">Home</text>
    </g>
    <!-- Kandidaten -->
    <g transform="translate(340, 0)">
      <circle cx="15" cy="10" r="20" fill="none" stroke="#999" stroke-width="4"/>
      <path d="M -10 60 Q 15 30 40 60" stroke="#999" stroke-width="4" fill="none"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Kandidaten</text>
    </g>
    <!-- Kanban -->
    <g transform="translate(580, 0)">
      <rect x="-15" y="-5" width="14" height="40" rx="3" fill="none" stroke="#999" stroke-width="4"/>
      <rect x="5" y="-5" width="14" height="25" rx="3" fill="none" stroke="#999" stroke-width="4"/>
      <rect x="25" y="-5" width="14" height="35" rx="3" fill="none" stroke="#999" stroke-width="4"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Kanban</text>
    </g>
    <!-- Mail -->
    <g transform="translate(820, 0)">
      <rect x="-15" y="0" width="50" height="36" rx="4" fill="none" stroke="#999" stroke-width="4"/>
      <path d="M -15 0 L 10 22 L 35 0" stroke="#999" stroke-width="4" fill="none"/>
      <circle cx="35" cy="0" r="10" fill="#ef4444"/>
      <text x="10" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Inbox</text>
    </g>
    <!-- Profiel -->
    <g transform="translate(1020, 0)">
      <circle cx="15" cy="15" r="22" fill="none" stroke="#999" stroke-width="4"/>
      <circle cx="15" cy="8" r="8" fill="#999"/>
      <path d="M 0 28 Q 15 18 30 28" stroke="#999" stroke-width="4" fill="none"/>
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="500" fill="#999">Mij</text>
    </g>
  </g>

  <!-- Home indicator -->
  <rect x="${W/2-150}" y="${H-50}" width="300" height="8" rx="4" fill="#000"/>
</svg>`;

const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
const path = "/Users/macbook/Desktop/noah-iphone-mockup.png";
await sharp(buffer).resize(750).toFile(path);
console.log("→", path);
