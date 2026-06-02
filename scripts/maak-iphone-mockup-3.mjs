// Voorstel + Agenda + Coaching mockups voor iOS
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

function tabBar(actief) {
  const T = (label, x, isActief, icoon) => `
    <g transform="translate(${x}, 0)">
      ${icoon(isActief)}
      <text x="15" y="90" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="${isActief?600:500}" fill="${isActief?'#333399':'#999'}">${label}</text>
    </g>`;
  const home = (a) => `<rect x="-15" y="0" width="50" height="32" rx="6" fill="${a?'#333399':'none'}" stroke="${a?'#333399':'#999'}" stroke-width="4"/><path d="M -20 0 L 10 -22 L 40 0" stroke="${a?'#333399':'#999'}" stroke-width="4" fill="none"/>`;
  const kand = (a) => `<circle cx="15" cy="10" r="20" fill="${a?'#333399':'none'}" stroke="${a?'#333399':'#999'}" stroke-width="4"/><path d="M -10 60 Q 15 30 40 60" stroke="${a?'#333399':'#999'}" stroke-width="4" fill="none"/>`;
  const kanban = (a) => `<rect x="-15" y="-5" width="14" height="40" rx="3" fill="${a?'#333399':'none'}" stroke="${a?'#333399':'#999'}" stroke-width="4"/><rect x="5" y="-5" width="14" height="25" rx="3" fill="${a?'#333399':'none'}" stroke="${a?'#333399':'#999'}" stroke-width="4"/><rect x="25" y="-5" width="14" height="35" rx="3" fill="${a?'#333399':'none'}" stroke="${a?'#333399':'#999'}" stroke-width="4"/>`;
  const inbox = (a) => `<rect x="-15" y="0" width="50" height="36" rx="4" fill="${a?'#333399':'none'}" stroke="${a?'#333399':'#999'}" stroke-width="4"/><path d="M -15 0 L 10 22 L 35 0" stroke="${a?'#333399':'#999'}" stroke-width="4" fill="none"/>`;
  const mij = (a) => `<circle cx="15" cy="15" r="22" fill="${a?'#333399':'none'}" stroke="${a?'#333399':'#999'}" stroke-width="4"/><circle cx="15" cy="8" r="8" fill="${a?'#fff':'#999'}"/>`;
  return `
  <rect x="30" y="${H-260}" width="${W-60}" height="230" fill="#fff" filter="url(#shad)"/>
  <line x1="60" y1="${H-260}" x2="${W-60}" y2="${H-260}" stroke="#e5e5e5" stroke-width="2"/>
  <g transform="translate(0, ${H-220})">
    ${T("Home", 120, actief==="home", home)}
    ${T("Kandidaten", 340, actief==="kandidaten", kand)}
    ${T("Kanban", 580, actief==="kanban", kanban)}
    ${T("Inbox", 820, actief==="inbox", inbox)}
    ${T("Mij", 1020, actief==="mij", mij)}
  </g>`;
}

// ============================================================
// MOCKUP 3: VOORSTEL VERSTUREN
// ============================================================
const voorstel = frame(`
  <rect x="30" y="220" width="${W-60}" height="200" fill="url(#paars)"/>
  <text x="80" y="320" font-family="-apple-system" font-size="56" fill="#fff">‹</text>
  <text x="125" y="320" font-family="-apple-system" font-size="32" font-weight="500" fill="#fff" opacity="0.85">Terug</text>
  <text x="${W/2}" y="395" text-anchor="middle" font-family="-apple-system" font-size="56" font-weight="800" fill="#fff">Voorstel versturen</text>

  <!-- Kandidaat-kaart -->
  <g transform="translate(80, 480)">
    <rect width="${W-160}" height="200" rx="32" fill="#fff" filter="url(#shad)"/>
    <circle cx="100" cy="100" r="60" fill="#3b82f6"/>
    <text x="100" y="118" text-anchor="middle" font-family="-apple-system" font-size="52" font-weight="800" fill="#fff">JV</text>
    <text x="200" y="85" font-family="-apple-system" font-size="40" font-weight="700" fill="#000">Jan Vermeer</text>
    <text x="200" y="135" font-family="-apple-system" font-size="30" fill="#666">Backend developer · € 80/u</text>
    <text x="200" y="175" font-family="-apple-system" font-size="26" fill="#10b981">Per direct beschikbaar</text>
  </g>

  <!-- Sectie: Naar -->
  <text x="80" y="780" font-family="-apple-system" font-size="32" font-weight="700" fill="#333">NAAR</text>
  <g transform="translate(80, 810)">
    <rect width="${W-160}" height="150" rx="28" fill="#fff" filter="url(#shad)"/>
    <text x="40" y="65" font-family="-apple-system" font-size="32" font-weight="600" fill="#000">ABC Bouw B.V.</text>
    <text x="40" y="115" font-family="-apple-system" font-size="28" fill="#666">marieke@abcbouw.nl</text>
    <text x="${W-220}" y="90" text-anchor="middle" font-family="-apple-system" font-size="40" fill="#333399">›</text>
  </g>

  <!-- Sectie: Opties -->
  <text x="80" y="1060" font-family="-apple-system" font-size="32" font-weight="700" fill="#333">OPTIES</text>
  <g transform="translate(80, 1090)">
    <rect width="${W-160}" height="380" rx="28" fill="#fff" filter="url(#shad)"/>

    <text x="40" y="75" font-family="-apple-system" font-size="32" fill="#000">CV meesturen</text>
    <rect x="${W-260}" y="50" width="100" height="60" rx="30" fill="#10b981"/>
    <circle cx="${W-180}" cy="80" r="22" fill="#fff"/>
    <line x1="40" y1="125" x2="${W-200}" y2="125" stroke="#f0f0f0" stroke-width="2"/>

    <text x="40" y="200" font-family="-apple-system" font-size="32" fill="#000">Tarief tonen</text>
    <rect x="${W-260}" y="175" width="100" height="60" rx="30" fill="#10b981"/>
    <circle cx="${W-180}" cy="205" r="22" fill="#fff"/>
    <line x1="40" y1="250" x2="${W-200}" y2="250" stroke="#f0f0f0" stroke-width="2"/>

    <text x="40" y="325" font-family="-apple-system" font-size="32" fill="#000">Aliasnaam gebruiken</text>
    <rect x="${W-260}" y="300" width="100" height="60" rx="30" fill="#e5e5e5"/>
    <circle cx="${W-240}" cy="330" r="22" fill="#fff"/>
  </g>

  <!-- Bericht-veld -->
  <text x="80" y="1570" font-family="-apple-system" font-size="32" font-weight="700" fill="#333">PERSOONLIJK BERICHT</text>
  <g transform="translate(80, 1600)">
    <rect width="${W-160}" height="280" rx="28" fill="#fff" filter="url(#shad)"/>
    <text x="40" y="80" font-family="-apple-system" font-size="32" fill="#666" font-style="italic">Hoi Marieke,</text>
    <text x="40" y="135" font-family="-apple-system" font-size="32" fill="#666" font-style="italic">Jan is per direct beschikbaar</text>
    <text x="40" y="180" font-family="-apple-system" font-size="32" fill="#666" font-style="italic">voor jullie backend-rol. Hij heeft</text>
    <text x="40" y="225" font-family="-apple-system" font-size="32" fill="#666" font-style="italic">12 jaar Java + Spring ervaring...</text>
  </g>

  <!-- AI-suggestie -->
  <g transform="translate(80, 1930)">
    <rect width="${W-160}" height="100" rx="28" fill="#fef3c7"/>
    <text x="40" y="65" font-family="-apple-system" font-size="30" font-weight="600" fill="#92400e">✨ Robin: maak bericht persoonlijker?</text>
  </g>

  <!-- Versturen-knop -->
  <g transform="translate(80, 2090)">
    <rect width="${W-160}" height="110" rx="55" fill="#333399"/>
    <text x="${(W-160)/2}" y="73" text-anchor="middle" font-family="-apple-system" font-size="36" font-weight="700" fill="#fff">Voorstel versturen →</text>
  </g>

  ${tabBar("kandidaten")}
`);

// ============================================================
// MOCKUP 4: AGENDA
// ============================================================
const agenda = frame(`
  <rect x="30" y="220" width="${W-60}" height="240" fill="url(#paars)"/>
  <text x="80" y="335" font-family="-apple-system" font-size="64" font-weight="800" fill="#fff">Agenda</text>
  <text x="80" y="395" font-family="-apple-system" font-size="32" fill="#fff" opacity="0.8">Maandag 1 juni · 5 afspraken</text>

  <!-- Datum-strip -->
  <g transform="translate(80, 500)">
    ${[
      ["Ma", "1", true],
      ["Di", "2", false],
      ["Wo", "3", false],
      ["Do", "4", false],
      ["Vr", "5", false],
      ["Za", "6", false],
      ["Zo", "7", false],
    ].map(([dag, num, actief], i) => `
      <g transform="translate(${i*150}, 0)">
        <rect width="130" height="170" rx="26" fill="${actief?'#333399':'#fff'}" filter="url(#shad)"/>
        <text x="65" y="60" text-anchor="middle" font-family="-apple-system" font-size="26" font-weight="500" fill="${actief?'#fff':'#666'}" opacity="${actief?0.85:1}">${dag}</text>
        <text x="65" y="125" text-anchor="middle" font-family="-apple-system" font-size="56" font-weight="800" fill="${actief?'#fff':'#000'}">${num}</text>
      </g>
    `).join("")}
  </g>

  <!-- Events -->
  <text x="80" y="780" font-family="-apple-system" font-size="32" font-weight="700" fill="#333">VANDAAG</text>

  <!-- Event 1 -->
  <g transform="translate(80, 820)">
    <rect width="${W-160}" height="180" rx="28" fill="#fff" filter="url(#shad)"/>
    <rect x="0" y="0" width="14" height="180" rx="7" fill="#10b981"/>
    <text x="50" y="60" font-family="-apple-system" font-size="30" font-weight="800" fill="#10b981">09:00 — 09:30</text>
    <text x="50" y="110" font-family="-apple-system" font-size="36" font-weight="700" fill="#000">Daily stand-up</text>
    <text x="50" y="155" font-family="-apple-system" font-size="26" fill="#666">Team · Microsoft Teams</text>
  </g>

  <!-- Event 2 (actief, paars) -->
  <g transform="translate(80, 1020)">
    <rect width="${W-160}" height="220" rx="28" fill="#333399" filter="url(#shad)"/>
    <text x="40" y="60" font-family="-apple-system" font-size="30" font-weight="800" fill="#ffd84d">10:30 — 11:30 · NU</text>
    <text x="40" y="115" font-family="-apple-system" font-size="36" font-weight="700" fill="#fff">Intake Jan Vermeer</text>
    <text x="40" y="160" font-family="-apple-system" font-size="26" fill="#fff" opacity="0.85">Backend developer</text>
    <rect x="40" y="180" width="180" height="50" rx="25" fill="#fff" opacity="0.2"/>
    <text x="130" y="213" text-anchor="middle" font-family="-apple-system" font-size="24" font-weight="600" fill="#fff">📞 Bel nu</text>
  </g>

  <!-- Event 3 -->
  <g transform="translate(80, 1260)">
    <rect width="${W-160}" height="180" rx="28" fill="#fff" filter="url(#shad)"/>
    <rect x="0" y="0" width="14" height="180" rx="7" fill="#3b82f6"/>
    <text x="50" y="60" font-family="-apple-system" font-size="30" font-weight="800" fill="#3b82f6">14:00 — 15:00</text>
    <text x="50" y="110" font-family="-apple-system" font-size="36" font-weight="700" fill="#000">Intake Sanne Klein</text>
    <text x="50" y="155" font-family="-apple-system" font-size="26" fill="#666">UX designer · Op kantoor</text>
  </g>

  <!-- Event 4 -->
  <g transform="translate(80, 1460)">
    <rect width="${W-160}" height="180" rx="28" fill="#fff" filter="url(#shad)"/>
    <rect x="0" y="0" width="14" height="180" rx="7" fill="#f59e0b"/>
    <text x="50" y="60" font-family="-apple-system" font-size="30" font-weight="800" fill="#f59e0b">15:30 — 16:00</text>
    <text x="50" y="110" font-family="-apple-system" font-size="36" font-weight="700" fill="#000">Voorstel-overleg ABC Bouw</text>
    <text x="50" y="155" font-family="-apple-system" font-size="26" fill="#666">Met Marieke (HR) · Zoom</text>
  </g>

  <!-- Event 5 -->
  <g transform="translate(80, 1660)">
    <rect width="${W-160}" height="180" rx="28" fill="#fff" filter="url(#shad)"/>
    <rect x="0" y="0" width="14" height="180" rx="7" fill="#a855f7"/>
    <text x="50" y="60" font-family="-apple-system" font-size="30" font-weight="800" fill="#a855f7">17:00 — 17:15</text>
    <text x="50" y="110" font-family="-apple-system" font-size="36" font-weight="700" fill="#000">EOD-rapport invullen</text>
    <text x="50" y="155" font-family="-apple-system" font-size="26" fill="#666">Dagelijkse coaching-check</text>
  </g>

  <!-- FAB -->
  <circle cx="${W-150}" cy="${H-380}" r="80" fill="#333399" filter="url(#shad)"/>
  <text x="${W-150}" y="${H-355}" text-anchor="middle" font-family="-apple-system" font-size="100" fill="#fff">+</text>

  ${tabBar("home")}
`);

// ============================================================
// MOCKUP 5: COACHING / EOD
// ============================================================
const coaching = frame(`
  <rect x="30" y="220" width="${W-60}" height="380" fill="url(#paars)"/>
  <text x="80" y="320" font-family="-apple-system" font-size="56" fill="#fff">‹</text>
  <text x="125" y="320" font-family="-apple-system" font-size="32" font-weight="500" fill="#fff" opacity="0.85">Coaching</text>
  <text x="${W/2}" y="430" text-anchor="middle" font-family="-apple-system" font-size="56" font-weight="800" fill="#fff">EOD rapport</text>
  <text x="${W/2}" y="490" text-anchor="middle" font-family="-apple-system" font-size="32" fill="#fff" opacity="0.85">Maandag 1 juni</text>

  <!-- Records & doelen card -->
  <g transform="translate(80, 660)">
    <rect width="${W-160}" height="280" rx="32" fill="#fff" filter="url(#shad)"/>
    <text x="50" y="80" font-family="-apple-system" font-size="32" font-weight="700" fill="#000">Jouw records</text>

    <!-- Record items -->
    <g transform="translate(50, 110)">
      <text x="0" y="40" font-family="-apple-system" font-size="28" fill="#666">Gesprekken</text>
      <text x="${W-330}" y="40" text-anchor="end" font-family="-apple-system" font-size="28" font-weight="700" fill="#333399">47</text>
      <text x="${W-220}" y="40" font-family="-apple-system" font-size="24" fill="#999">/ 30 doel</text>
      <rect x="0" y="55" width="${W-260}" height="12" rx="6" fill="#f0f0f0"/>
      <rect x="0" y="55" width="${W-260}" height="12" rx="6" fill="#10b981"/>

      <text x="0" y="130" font-family="-apple-system" font-size="28" fill="#666">Intakes</text>
      <text x="${W-330}" y="130" text-anchor="end" font-family="-apple-system" font-size="28" font-weight="700" fill="#333399">3</text>
      <text x="${W-220}" y="130" font-family="-apple-system" font-size="24" fill="#999">/ 5 doel</text>
      <rect x="0" y="145" width="${W-260}" height="12" rx="6" fill="#f0f0f0"/>
      <rect x="0" y="145" width="${(W-260)*0.6}" height="12" rx="6" fill="#f59e0b"/>
    </g>
  </g>

  <!-- Vragen -->
  <text x="80" y="1010" font-family="-apple-system" font-size="32" font-weight="700" fill="#333">HOE GING JE DAG?</text>

  <g transform="translate(80, 1050)">
    <rect width="${W-160}" height="180" rx="28" fill="#fff" filter="url(#shad)"/>
    <text x="40" y="70" font-family="-apple-system" font-size="32" font-weight="600" fill="#000">Hoe voelde je je vandaag?</text>
    <g transform="translate(40, 100)">
      ${[
        ["😞", "#fef2f2"],
        ["😐", "#fef3c7"],
        ["🙂", "#fef3c7"],
        ["😀", "#dcfce7"],
        ["🤩", "#333399"],
      ].map(([emoji, kleur], i) => `
        <g transform="translate(${i*195}, 0)">
          <circle cx="60" cy="40" r="50" fill="${kleur}" stroke="${i===4?'#333399':'transparent'}" stroke-width="5"/>
          <text x="60" y="60" text-anchor="middle" font-family="-apple-system" font-size="60">${emoji}</text>
        </g>
      `).join("")}
    </g>
  </g>

  <!-- Text-vragen -->
  <g transform="translate(80, 1260)">
    <rect width="${W-160}" height="200" rx="28" fill="#fff" filter="url(#shad)"/>
    <text x="40" y="65" font-family="-apple-system" font-size="32" font-weight="600" fill="#000">Wat liep top?</text>
    <text x="40" y="120" font-family="-apple-system" font-size="28" fill="#666" font-style="italic">Eindelijk een ja van ABC Bouw</text>
    <text x="40" y="165" font-family="-apple-system" font-size="28" fill="#666" font-style="italic">na 6 weken belwerk. 🎉</text>
  </g>

  <g transform="translate(80, 1490)">
    <rect width="${W-160}" height="200" rx="28" fill="#fff" filter="url(#shad)"/>
    <text x="40" y="65" font-family="-apple-system" font-size="32" font-weight="600" fill="#000">Wat had beter gekund?</text>
    <text x="40" y="120" font-family="-apple-system" font-size="28" fill="#666" font-style="italic">Te lang aan voicemail-rondjes</text>
    <text x="40" y="165" font-family="-apple-system" font-size="28" fill="#666" font-style="italic">vastgehouden vanmorgen.</text>
  </g>

  <!-- Coach-button -->
  <g transform="translate(80, 1730)">
    <rect width="${W-160}" height="130" rx="28" fill="#fef3c7"/>
    <text x="40" y="60" font-family="-apple-system" font-size="28" font-weight="700" fill="#92400e">💬 Vraag coaching van Yorith</text>
    <text x="40" y="100" font-family="-apple-system" font-size="24" fill="#92400e">Tip nodig? Hij belt binnen 24u terug.</text>
  </g>

  <!-- Verstuur-knop -->
  <g transform="translate(80, 1900)">
    <rect width="${W-160}" height="110" rx="55" fill="#333399"/>
    <text x="${(W-160)/2}" y="73" text-anchor="middle" font-family="-apple-system" font-size="36" font-weight="700" fill="#fff">Verstuur EOD →</text>
  </g>

  ${tabBar("mij")}
`);

await sharp(Buffer.from(voorstel)).resize(750).png().toFile("/Users/macbook/Desktop/noah-iphone-voorstel.png");
console.log("→ /Users/macbook/Desktop/noah-iphone-voorstel.png");

await sharp(Buffer.from(agenda)).resize(750).png().toFile("/Users/macbook/Desktop/noah-iphone-agenda.png");
console.log("→ /Users/macbook/Desktop/noah-iphone-agenda.png");

await sharp(Buffer.from(coaching)).resize(750).png().toFile("/Users/macbook/Desktop/noah-iphone-coaching.png");
console.log("→ /Users/macbook/Desktop/noah-iphone-coaching.png");
