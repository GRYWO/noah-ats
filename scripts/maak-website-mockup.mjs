// Website mockup voor Noah-ATS — desktop view
import sharp from "sharp";

const W = 1440;
const H = 3600;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="hero" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333399"/>
      <stop offset="60%" stop-color="#1f1f5c"/>
      <stop offset="100%" stop-color="#0f0f23"/>
    </linearGradient>
    <linearGradient id="howto" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1f1f5c"/>
      <stop offset="100%" stop-color="#0f0f23"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#ffd84d" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#333399" stop-opacity="0"/>
    </radialGradient>
    <filter id="shad" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="20" flood-color="#000" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- ─── HERO ─── -->
  <rect width="${W}" height="900" fill="url(#hero)"/>
  <ellipse cx="720" cy="400" rx="500" ry="500" fill="url(#glow)"/>

  <!-- Navbar -->
  <rect width="${W}" height="70" fill="rgba(15,15,35,0.8)"/>
  <text x="50" y="46" font-family="-apple-system, Helvetica" font-size="32" font-weight="900" fill="#fff" letter-spacing="-2">noah</text>
  <circle cx="120" cy="40" r="5" fill="#ffd84d"/>
  <g font-family="-apple-system" font-size="14" fill="rgba(255,255,255,0.7)">
    <text x="640" y="46">Voor wie</text>
    <text x="740" y="46">Features</text>
    <text x="845" y="46">Hoe het werkt</text>
    <text x="975" y="46">Tarieven</text>
    <text x="1075" y="46">Handleiding</text>
  </g>
  <rect x="1240" y="20" width="110" height="38" rx="8" fill="#fff"/>
  <text x="1295" y="44" text-anchor="middle" font-family="-apple-system" font-size="14" font-weight="700" fill="#333399">Inloggen</text>

  <!-- GRYWO badge -->
  <rect x="${W/2-130}" y="180" width="260" height="36" rx="18" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/>
  <text x="${W/2}" y="203" text-anchor="middle" font-family="-apple-system" font-size="12" fill="rgba(255,255,255,0.8)">Powered by GRYWO · Een product van GRYWO</text>

  <!-- Noah logo groot -->
  <text x="${W/2}" y="380" text-anchor="middle" font-family="-apple-system" font-weight="900" font-size="160" fill="#fff" letter-spacing="-10">noah</text>
  <circle cx="${W/2+220}" cy="380" r="22" fill="#ffd84d"/>

  <!-- Tagline -->
  <text x="${W/2}" y="490" text-anchor="middle" font-family="-apple-system" font-weight="900" font-size="72" fill="#fff" letter-spacing="-2">Recruitment op <tspan fill="#ffd84d">autopilot.</tspan></text>
  <text x="${W/2}" y="560" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="300" fill="rgba(255,255,255,0.7)">De toekomst zit hier. Een AI-gedreven ATS die kandidaten, voorstellen</text>
  <text x="${W/2}" y="595" text-anchor="middle" font-family="-apple-system" font-size="22" font-weight="300" fill="rgba(255,255,255,0.7)">en coaching automatisch laat lopen.</text>

  <!-- CTA's -->
  <rect x="${W/2-200}" y="650" width="190" height="60" rx="12" fill="#fff"/>
  <text x="${W/2-105}" y="688" text-anchor="middle" font-family="-apple-system" font-size="17" font-weight="700" fill="#333399">Inloggen →</text>
  <text x="${W/2+90}" y="688" text-anchor="middle" font-family="-apple-system" font-size="17" font-weight="600" fill="rgba(255,255,255,0.8)">Hoe het werkt ↓</text>

  <!-- Trust badges -->
  <g font-family="-apple-system" font-size="13" fill="rgba(255,255,255,0.85)">
    ${["AVG-proof", "Made in NL", "eIDAS-handtekeningen", "Multi-tenant + RLS"].map((t, i) => {
      const x = W/2 - 320 + i*180;
      return `<rect x="${x}" y="780" width="160" height="36" rx="18" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)"/><text x="${x+80}" y="803" text-anchor="middle">${t}</text>`;
    }).join("")}
  </g>

  <!-- ─── VOOR WIE ─── -->
  <rect y="900" width="${W}" height="700" fill="#f5f5f7"/>
  <text x="${W/2}" y="990" text-anchor="middle" font-family="-apple-system" font-size="14" font-weight="700" fill="#333399" letter-spacing="2">VOOR WIE</text>
  <text x="${W/2}" y="1040" text-anchor="middle" font-family="-apple-system" font-size="44" font-weight="900" fill="#111">Drie rollen, één platform</text>
  <text x="${W/2}" y="1085" text-anchor="middle" font-family="-apple-system" font-size="18" fill="#666">Noah past zich aan jouw rol aan — automatisch, zonder configuratie.</text>

  <!-- 3 persona cards -->
  ${[
    { x: 100, kleur: "#3b82f6", icoon: "👥", titel: "Bureau-admins", tekst: "Beheer je hele bureau vanuit één scherm. Kandidaten, voorstellen en je team — alles binnen je eigen tenant.", punten: ["Tot 4+ recruiters", "Auto-upgrade abonnement", "Eigen huisstijl"]},
    { x: 510, kleur: "#10b981", icoon: "🎯", titel: "Recruiters", tekst: "Focus op gesprekken, niet op administratie. Robin schrijft je voorstellen, Jobdigger vult je bellijst.", punten: ["1-klik kandidaten", "AI-voorstellen", "Auto-reminders"]},
    { x: 920, kleur: "#a855f7", icoon: "📞", titel: "Setters", tekst: "Eigen abonnement, eigen kandidaten, eigen coaching-dashboard. Dagelijkse EOD verhoogt prestaties.", punten: ["€250/mnd stoel", "EOD-coaching", "Records en doelen"]},
  ].map(p => `
    <g transform="translate(${p.x}, 1150)">
      <rect width="420" height="320" rx="28" fill="#fff" filter="url(#shad)"/>
      <rect x="35" y="35" width="55" height="55" rx="16" fill="${p.kleur}"/>
      <text x="62" y="78" text-anchor="middle" font-size="32">${p.icoon}</text>
      <text x="35" y="135" font-family="-apple-system" font-size="22" font-weight="900" fill="#111">${p.titel}</text>
      <text x="35" y="170" font-family="-apple-system" font-size="14" fill="#666">${p.tekst.slice(0,55)}</text>
      <text x="35" y="190" font-family="-apple-system" font-size="14" fill="#666">${p.tekst.slice(55,110)}</text>
      <text x="35" y="210" font-family="-apple-system" font-size="14" fill="#666">${p.tekst.slice(110,160)}</text>
      ${p.punten.map((pt, i) => `
        <text x="50" y="${260+i*25}" font-family="-apple-system" font-size="13" fill="#10b981" font-weight="700">✓</text>
        <text x="72" y="${260+i*25}" font-family="-apple-system" font-size="13" fill="#444">${pt}</text>
      `).join("")}
    </g>
  `).join("")}

  <!-- ─── FEATURES ─── -->
  <rect y="1600" width="${W}" height="900" fill="#fff"/>
  <text x="${W/2}" y="1700" text-anchor="middle" font-family="-apple-system" font-size="14" font-weight="700" fill="#333399" letter-spacing="2">FEATURES</text>
  <text x="${W/2}" y="1755" text-anchor="middle" font-family="-apple-system" font-size="44" font-weight="900" fill="#111">Alles wat een ATS moet doen. <tspan fill="#333399">En meer.</tspan></text>

  ${[
    { x: 100, y: 1850, kleur: "#ec4899", icoon: "✨", titel: "Robin AI", tekst: "Claude-aangedreven assistent voor CV's, voorstellen, contracten."},
    { x: 510, y: 1850, kleur: "#333399", icoon: "📞", titel: "Jobdigger 1-klik", tekst: "Chrome-extensie importeert kandidaten direct vanuit vacatures."},
    { x: 920, y: 1850, kleur: "#10b981", icoon: "🎯", titel: "Kanban-flow", tekst: "Zes kolommen, drag-and-drop triggert mailflows automatisch."},
    { x: 100, y: 2070, kleur: "#f59e0b", icoon: "📅", titel: "Slimme agenda", tekst: "Rol-based filtering en reminders 30 min van tevoren."},
    { x: 510, y: 2070, kleur: "#ef4444", icoon: "⚡", titel: "EOD-coaching", tekst: "Dagelijkse 5-min reflectie. Coach reageert met notificatie."},
    { x: 920, y: 2070, kleur: "#3b82f6", icoon: "✉", titel: "Inbox", tekst: "Native mail, mappen, auto-import CV's, gekoppeld aan kandidaten."},
    { x: 100, y: 2290, kleur: "#a855f7", icoon: "✍", titel: "eIDAS-handtekeningen", tekst: "DPA, NDA, contracten via token-link. Rechtsgeldig EU-breed."},
    { x: 510, y: 2290, kleur: "#06b6d4", icoon: "💳", titel: "Stripe-abonnementen", tekst: "Payment-first flow, auto-upgrade, volledige cockpit."},
    { x: 920, y: 2290, kleur: "#84cc16", icoon: "🔒", titel: "Beveiliging", tekst: "Single-device, 60-min uitlog, RLS, AVG art. 15+17."},
  ].map(f => `
    <g transform="translate(${f.x}, ${f.y})">
      <rect width="420" height="180" rx="20" fill="#fff" stroke="#f0f0f0"/>
      <rect x="30" y="30" width="50" height="50" rx="14" fill="${f.kleur}"/>
      <text x="55" y="68" text-anchor="middle" font-size="26">${f.icoon}</text>
      <text x="30" y="115" font-family="-apple-system" font-size="19" font-weight="700" fill="#111">${f.titel}</text>
      <text x="30" y="143" font-family="-apple-system" font-size="13" fill="#666">${f.tekst.slice(0,55)}</text>
      <text x="30" y="160" font-family="-apple-system" font-size="13" fill="#666">${f.tekst.slice(55,110)}</text>
    </g>
  `).join("")}

  <!-- ─── TARIEVEN ─── -->
  <rect y="2500" width="${W}" height="700" fill="#f5f5f7"/>
  <text x="${W/2}" y="2600" text-anchor="middle" font-family="-apple-system" font-size="14" font-weight="700" fill="#333399" letter-spacing="2">TARIEVEN</text>
  <text x="${W/2}" y="2650" text-anchor="middle" font-family="-apple-system" font-size="44" font-weight="900" fill="#111">Eerlijk en voorspelbaar</text>

  ${[
    { x: 200, w: 350, prijs: "5.000", naam: "Starter", uitleg: "1 recruiter", populair: false},
    { x: 545, w: 350, prijs: "10.000", naam: "Pro", uitleg: "2-3 recruiters", populair: true},
    { x: 890, w: 350, prijs: "15.000", naam: "Enterprise", uitleg: "4+ recruiters", populair: false},
  ].map(p => `
    <g transform="translate(${p.x}, ${p.populair ? 2720 : 2750})">
      ${p.populair ? `
        <rect width="${p.w}" height="430" rx="28" fill="#333399" stroke="#ffd84d" stroke-width="3"/>
        <rect x="${p.w/2-90}" y="-18" width="180" height="36" rx="18" fill="#ffd84d"/>
        <text x="${p.w/2}" y="6" text-anchor="middle" font-family="-apple-system" font-size="13" font-weight="900" fill="#333399">MEEST GEKOZEN</text>
      ` : `
        <rect width="${p.w}" height="400" rx="28" fill="#fff" stroke="#e5e5e5"/>
      `}
      <text x="35" y="60" font-family="-apple-system" font-size="28" font-weight="900" fill="${p.populair?'#fff':'#111'}">${p.naam}</text>
      <text x="35" y="90" font-family="-apple-system" font-size="13" fill="${p.populair?'rgba(255,255,255,0.7)':'#666'}">${p.uitleg}</text>
      <text x="35" y="170" font-family="-apple-system" font-size="20" font-weight="700" fill="${p.populair?'#fff':'#111'}">€</text>
      <text x="58" y="170" font-family="-apple-system" font-size="60" font-weight="900" fill="${p.populair?'#fff':'#111'}">${p.prijs}</text>
      <text x="35" y="195" font-family="-apple-system" font-size="13" fill="${p.populair?'rgba(255,255,255,0.6)':'#666'}">per maand</text>

      ${["Onbeperkt kandidaten","Robin AI inbegrepen","Jobdigger-extensie","Coaching-dashboard","eIDAS-handtekeningen"].map((k,i)=>`
        <text x="35" y="${245+i*28}" font-family="-apple-system" font-size="14" fill="${p.populair?'#ffd84d':'#10b981'}" font-weight="700">✓</text>
        <text x="57" y="${245+i*28}" font-family="-apple-system" font-size="14" fill="${p.populair?'rgba(255,255,255,0.9)':'#444'}">${k}</text>
      `).join("")}

      <rect x="35" y="${p.populair?385:355}" width="${p.w-70}" height="40" rx="10" fill="${p.populair?'#ffd84d':'#333399'}"/>
      <text x="${p.w/2}" y="${p.populair?411:381}" text-anchor="middle" font-family="-apple-system" font-size="15" font-weight="700" fill="${p.populair?'#333399':'#fff'}">Start nu</text>
    </g>
  `).join("")}

  <!-- ─── QUOTE ─── -->
  <rect y="3200" width="${W}" height="300" fill="#fff"/>
  <text x="${W/2}" y="3290" text-anchor="middle" font-family="serif" font-size="80" fill="#333399">"</text>
  <text x="${W/2}" y="3360" text-anchor="middle" font-family="-apple-system" font-size="36" font-weight="900" fill="#111">Noah is niet zomaar software.</text>
  <text x="${W/2}" y="3410" text-anchor="middle" font-family="-apple-system" font-size="36" font-weight="900" fill="#333399">Het is het hart van GRYWO.</text>

  <g transform="translate(${W/2-90}, 3445)">
    <circle cx="22" cy="22" r="22" fill="#333399"/>
    <text x="22" y="29" text-anchor="middle" font-family="-apple-system" font-size="14" font-weight="700" fill="#fff">YH</text>
    <text x="55" y="20" font-family="-apple-system" font-size="14" font-weight="700" fill="#111">Yorith Hulzebosch</text>
    <text x="55" y="38" font-family="-apple-system" font-size="12" fill="#666">Oprichter GRYWO</text>
  </g>

  <!-- ─── FOOTER ─── -->
  <rect y="3500" width="${W}" height="100" fill="#0f0f23"/>
  <text x="50" y="3540" font-family="-apple-system" font-size="22" font-weight="900" fill="#fff" letter-spacing="-1">noah</text>
  <circle cx="100" cy="3534" r="3" fill="#ffd84d"/>
  <text x="50" y="3565" font-family="-apple-system" font-size="11" fill="rgba(255,255,255,0.5)">Recruitment op autopilot. Een product van GRYWO.</text>
  <text x="${W-50}" y="3540" text-anchor="end" font-family="-apple-system" font-size="11" fill="rgba(255,255,255,0.5)">© ${new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782</text>
  <text x="${W-50}" y="3560" text-anchor="end" font-family="-apple-system" font-size="11" fill="rgba(255,255,255,0.5)">Powered by GRYWO</text>
</svg>`;

await sharp(Buffer.from(svg)).resize(1100).png().toFile("/Users/macbook/Desktop/noah-website-voorbeeld.png");
console.log("→ /Users/macbook/Desktop/noah-website-voorbeeld.png");
