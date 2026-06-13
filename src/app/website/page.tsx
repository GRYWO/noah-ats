import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  MapPin,
  BadgeCheck,
  Sparkles,
  PhoneCall,
  Users,
  Target,
  Lock,
  Zap,
  Calendar,
  Mail,
  CreditCard,
  FileSignature,
  Check,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Noah-ATS — Recruitment op autopilot · AI-gedreven ATS",
  description:
    "Het hart van Noah recruitment. Eén platform voor recruiters, setters en bureau-admins — met Robin AI, Jobdigger-integratie en automatische coaching.",
};

export default function Website() {
  return (
    <main className="bg-white text-gray-900 overflow-hidden">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-[#0f0f23]/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/website" className="flex items-baseline">
            <span className="text-white text-2xl font-black tracking-tighter">noah</span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-[#ffd84d] inline-block" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#voor-wie" className="hover:text-white transition">Voor wie</a>
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#hoe" className="hover:text-white transition">Hoe het werkt</a>
            <a href="#tarieven" className="hover:text-white transition">Tarieven</a>
            <Link href="/handleiding" className="hover:text-white transition">Handleiding</Link>
          </div>
          <Link
            href="/login"
            className="bg-white hover:bg-[#ffd84d] text-[#333399] font-bold px-5 py-2 rounded-lg text-sm transition"
          >
            Inloggen
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen bg-[#0f0f23] text-white flex items-center justify-center overflow-hidden pt-24">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
        />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,216,77,0.3) 0%, rgba(51,51,153,0) 60%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center py-24">
          {/* GRYWO badge */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-xs text-white/80 mb-10 hover:bg-white/10 transition"
          >
            <Image src="/grywo-logo-wit.png" alt="Noah recruitment" width={50} height={14} className="opacity-90" />
            <span className="text-white/40">·</span>
            <span>Een product van Noah recruitment</span>
          </Link>

          {/* Noah-logo */}
          <div className="inline-flex items-baseline mb-8">
            <span className="text-white text-7xl md:text-9xl font-black tracking-tighter">noah</span>
            <span className="ml-3 w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#ffd84d] inline-block" />
          </div>

          <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Recruitment op{" "}
            <span className="text-[#ffd84d]">autopilot.</span>
          </h1>
          <p className="text-lg md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            De toekomst zit hier. Een{" "}
            <span className="text-white font-medium">AI-gedreven ATS</span> die
            kandidaten, voorstellen en coaching automatisch laat lopen — zodat
            jouw team weer ouderwets goed kan bellen.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link
              href="/login"
              className="bg-white hover:bg-[#ffd84d] text-[#333399] font-bold px-10 py-4 rounded-xl shadow-2xl transition-all hover:-translate-y-0.5 text-base inline-flex items-center gap-2"
            >
              Inloggen <ArrowRight size={18} />
            </Link>
            <a
              href="#hoe"
              className="text-white/80 hover:text-white font-semibold px-6 py-4 transition"
            >
              Hoe het werkt ↓
            </a>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
            <Trust icon={<ShieldCheck size={14} />} label="AVG-proof" />
            <Trust icon={<MapPin size={14} />} label="Made in NL" />
            <Trust icon={<BadgeCheck size={14} />} label="eIDAS-handtekeningen" />
            <Trust icon={<Lock size={14} />} label="Multi-tenant + RLS" />
          </div>

          {/* iPhone mockup floating */}
          <div className="relative mx-auto max-w-xs md:max-w-sm">
            <div
              aria-hidden
              className="absolute inset-0 bg-[#ffd84d]/30 blur-3xl rounded-full"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/website/dashboard.png"
              alt="Noah-ATS op iPhone"
              className="relative w-full drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ─── VOOR WIE ─── */}
      <section id="voor-wie" className="py-24 bg-[#f5f5f7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              Voor wie
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Drie rollen, één platform</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Noah past zich aan jouw rol aan — automatisch, zonder configuratie.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Persona
              kleur="#3b82f6"
              foto="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80"
              icoon={<Users size={28} />}
              titel="Bureau-admins"
              tekst="Beheer je hele bureau vanuit één scherm. Kandidaten, voorstellen, opdrachtgevers, plaatsingen en je team — alles binnen je eigen tenant met automatische RLS."
              punten={["Tot 4+ recruiters", "Automatische abonnement-upgrade", "Eigen huisstijl"]}
            />
            <Persona
              kleur="#10b981"
              foto="https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&q=80"
              icoon={<Target size={28} />}
              titel="Recruiters"
              tekst="Focus op gesprekken, niet op administratie. Robin schrijft je voorstellen, Jobdigger vult je bellijst en de kanban houdt de flow strak."
              punten={["1-klik kandidaten importeren", "AI-voorstellen", "Auto-reminders agenda"]}
            />
            <Persona
              kleur="#a855f7"
              foto="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80"
              icoon={<PhoneCall size={28} />}
              titel="Setters"
              tekst="Eigen abonnement (€250/mnd), eigen kandidaten, eigen coaching-dashboard. Dagelijkse EOD verhoogt je prestaties zonder dat het zwaar voelt."
              punten={["Setter-stoel €250/mnd", "EOD-coaching", "Eigen records en doelen"]}
            />
          </div>
        </div>
      </section>

      {/* ─── PRODUCT IN ACTIE ─── */}
      <section className="py-24 bg-gradient-to-b from-white to-[#f5f5f7]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              Noah in actie
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Zo ziet het er écht uit
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Drie schermen waar je dagelijks mee werkt — strak, snel en zonder ruis.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ProductScherm
              foto="/website/kanban.png"
              titel="Kanban-flow"
              tekst="Sleep kandidaten door de zes stappen. Elke overgang triggert automatisch de juiste mail."
            />
            <ProductScherm
              foto="/website/voorstel.png"
              titel="Voorstel versturen"
              tekst="Eén tik naar de opdrachtgever — met of zonder tarief, met of zonder achternaam."
            />
            <ProductScherm
              foto="/website/coaching.png"
              titel="EOD-coaching"
              tekst="Dagelijks vijf minuten reflectie. Mood, records, doelen. Coach reageert direct."
            />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              Features
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Alles wat een ATS moet doen.{" "}
              <span className="text-[#333399]">En meer.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <Feature
              kleur="#ec4899"
              icoon={<Sparkles />}
              titel="Robin AI"
              tekst="Claude-aangedreven assistent die CV's parseert, voorstellen schrijft en contracten controleert. Geen gimmick — een echte versneller."
            />
            <Feature
              kleur="#333399"
              icoon={<PhoneCall />}
              titel="Jobdigger 1-klik"
              tekst="Chrome-extensie importeert kandidaten direct vanuit vacature-pagina's. Of vult je zoekopdracht automatisch in. Eén klik, klaar."
            />
            <Feature
              kleur="#10b981"
              icoon={<Target />}
              titel="Kanban-flow"
              tekst="Zes kolommen van Nieuw tot Geplaatst. Drag-and-drop triggert automatisch mailflows naar opdrachtgevers."
            />
            <Feature
              kleur="#f59e0b"
              icoon={<Calendar />}
              titel="Slimme agenda"
              tekst="Rol-based filtering, automatische reminders 30 min van tevoren, team-events en intake-flow in één weergave."
            />
            <Feature
              kleur="#ef4444"
              icoon={<Zap />}
              titel="EOD-coaching"
              tekst="Setters vullen dagelijks een 5-min rapport in. Mood, top-moment, leerpunt. Coach reageert direct met notificatie."
            />
            <Feature
              kleur="#3b82f6"
              icoon={<Mail />}
              titel="Inbox"
              tekst="Native mail-koppeling, mappen, auto-import van CV's, threads gekoppeld aan kandidaten."
            />
            <Feature
              kleur="#a855f7"
              icoon={<FileSignature />}
              titel="eIDAS-handtekeningen"
              tekst="DPA, NDA, contracten — getekend via token-link met audit-trail, IP, user-agent. Rechtsgeldig volgens EU-wet."
            />
            <Feature
              kleur="#06b6d4"
              icoon={<CreditCard />}
              titel="Stripe-abonnementen"
              tekst="Betaling-eerst flow voor bureaus, auto-upgrade bij groei, setter-stoelen los. Volledige cockpit voor super-admin."
            />
            <Feature
              kleur="#84cc16"
              icoon={<Lock />}
              titel="Beveiliging op niveau"
              tekst="Single-device-policy, 60-min inactiviteits-uitlog, RLS multi-tenant, MFA optioneel. AVG art. 15+17 ingebouwd."
            />
          </div>
        </div>
      </section>

      {/* ─── HOE HET WERKT ─── */}
      <section id="hoe" className="py-24 bg-[#0f0f23] text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-[#1f1f5c] to-[#0f0f23]"
        />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm font-bold text-[#ffd84d] uppercase tracking-wider mb-3">
              Hoe het werkt
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Van eerste belletje tot plaatsing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <Stap
              nummer="01"
              titel="Kandidaat binnen"
              tekst="Via Jobdigger-extensie (1 klik vanuit vacature), handmatig of via inkomende mail. Robin parseert het CV automatisch."
            />
            <Stap
              nummer="02"
              titel="Intake & voorstel"
              tekst="Wizard met AI-rode-vlaggen. Voorstel met één klik naar opdrachtgever — eigen token-link, geen login nodig voor klant."
            />
            <Stap
              nummer="03"
              titel="Plaatsing & contract"
              tekst="Opdrachtgever tekent contract via eIDAS. Backoffice krijgt automatisch factuur-melding. Klaar."
            />
          </div>
        </div>
      </section>

      {/* ─── TARIEVEN ─── */}
      <section id="tarieven" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              Tarieven
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Eerlijk en voorspelbaar</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Geen verborgen kosten. Geen limieten op kandidaten of opdrachtgevers. Alles inbegrepen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            <Plan
              naam="Starter"
              prijs="5.000"
              uitleg="1 recruiter"
              kenmerken={[
                "1 recruiter-account",
                "Onbeperkt kandidaten",
                "Robin AI inbegrepen",
                "Jobdigger-extensie",
                "Mail-koppeling",
                "eIDAS-handtekeningen",
              ]}
            />
            <Plan
              naam="Pro"
              prijs="10.000"
              uitleg="2-3 recruiters"
              populair
              kenmerken={[
                "Tot 3 recruiter-accounts",
                "Alles uit Starter",
                "Coaching-dashboard",
                "Prioriteit-support",
                "Auto-upgrade bij groei",
                "EOD-coaching",
              ]}
            />
            <Plan
              naam="Enterprise"
              prijs="15.000"
              uitleg="4+ recruiters"
              kenmerken={[
                "Onbeperkt recruiters",
                "Alles uit Pro",
                "Eigen huisstijl",
                "Maatwerk integraties",
                "Dedicated coach",
                "SLA op aanvraag",
              ]}
            />
          </div>

          {/* Setter-stoel */}
          <div className="max-w-3xl mx-auto mt-10 bg-gradient-to-br from-[#333399] to-[#1f1f5c] text-white rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="text-sm font-bold text-[#ffd84d] uppercase tracking-wider mb-2">
                Voor individuele setters
              </div>
              <h3 className="text-2xl md:text-3xl font-black mb-2">Setter-stoel</h3>
              <p className="text-white/70 leading-relaxed">
                Werk je los van een bureau? Een eigen Noah-account met volledige
                ATS-toegang voor één vaste prijs.
              </p>
            </div>
            <div className="text-center md:text-right flex-shrink-0">
              <div className="text-5xl font-black">€250</div>
              <div className="text-white/60 text-sm">per maand</div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-3 bg-[#ffd84d] hover:bg-white text-[#333399] font-bold px-5 py-2.5 rounded-lg transition"
              >
                Start nu <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── QUOTE ─── */}
      <section className="py-24 bg-[#f5f5f7]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-6xl text-[#333399] mb-6 font-serif leading-none">"</div>
          <p className="text-2xl md:text-4xl font-bold leading-tight mb-6 text-gray-900">
            Noah is niet zomaar software.{" "}
            <span className="text-[#333399]">Het is het hart van Noah recruitment.</span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-12 h-12 rounded-full bg-[#333399] text-white font-bold flex items-center justify-center">
              YH
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Yorith Hulzebosch</div>
              <div className="text-sm text-gray-500">Oprichter Noah recruitment</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              Vragen
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">Veelgestelde vragen</h2>
          </div>

          <div className="space-y-3">
            <Faq
              vraag="Is mijn data veilig?"
              antwoord="Multi-tenant via Supabase Row Level Security — je ziet alleen jouw eigen bureau-data, op database-niveau afgedwongen. Single-device-policy + 60-min inactiviteits-uitlog. AVG-proof by design."
            />
            <Faq
              vraag="Wat als ik wil opzeggen?"
              antwoord="Maandelijks opzegbaar. Bij opzegging krijg je alle data via een AVG-artikel-15-export. Daarna wordt alles binnen 30 dagen vernietigd, behalve wettelijk te bewaren info (facturen, plaatsings-contracten)."
            />
            <Faq
              vraag="Werkt het ook op mobiel?"
              antwoord="Ja, volledig responsive webapp. Native iOS + Android apps zijn in ontwikkeling — gebruiken dezelfde backend, dus geen migratie of dubbele data."
            />
            <Faq
              vraag="Kan ik mijn eigen huisstijl gebruiken?"
              antwoord="Op Pro en Enterprise: ja. Logo + huiskleuren komen automatisch in voorstellen, mails en het kandidaat-portaal."
            />
            <Faq
              vraag="Hoe zit het met de setup-fee?"
              antwoord="Eenmalig €2.500 setup-fee bij bureau-aanmaak. Wordt automatisch via Stripe samen met de eerste maand afgerekend."
            />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23] text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-25 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,216,77,0.4) 0%, rgba(51,51,153,0) 60%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-baseline mb-6">
            <span className="text-white text-5xl font-black tracking-tighter">noah</span>
            <span className="ml-2 w-3 h-3 rounded-full bg-[#ffd84d] inline-block" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Klaar voor de toekomst van recruitment?
          </h2>
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl mx-auto">
            Plan een demo of probeer Noah direct — eerste maand met setup-fee inbegrepen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="bg-white hover:bg-[#ffd84d] text-[#333399] font-bold px-10 py-4 rounded-xl shadow-2xl transition-all hover:-translate-y-0.5 text-base inline-flex items-center gap-2"
            >
              Inloggen <ArrowRight size={18} />
            </Link>
            <a
              href="mailto:info@noah-recruitment.nl?subject=Demo%20Noah-ATS"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition"
            >
              Demo aanvragen
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0f0f23] text-white/60 py-14 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="inline-flex items-baseline mb-3">
                <span className="text-white text-2xl font-black tracking-tighter">noah</span>
                <span className="ml-1.5 w-2 h-2 rounded-full bg-[#ffd84d] inline-block" />
              </div>
              <p className="text-sm leading-relaxed">
                Recruitment op autopilot.<br />Een product van Noah recruitment.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#tarieven" className="hover:text-white transition">Tarieven</a></li>
                <li><Link href="/handleiding" className="hover:text-white transition">Handleiding</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Bedrijf</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:info@noah-recruitment.nl" className="hover:text-white transition">Contact</a></li>
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Inloggen</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/login" className="hover:text-white transition">Login</Link></li>
                <li><Link href="/wachtwoord-vergeten" className="hover:text-white transition">Wachtwoord vergeten</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs">
            <div>© {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782</div>
            <div className="flex items-center gap-2 mt-3 md:mt-0">
              <span>Powered by</span>
              <Image src="/grywo-logo-wit.png" alt="Noah recruitment" width={60} height={16} className="opacity-90" />
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── COMPONENTEN ───
function Trust({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-[12px] text-white/80">
      <span className="text-[#ffd84d]">{icon}</span>
      {label}
    </div>
  );
}

function Persona({
  kleur,
  foto,
  icoon,
  titel,
  tekst,
  punten,
}: {
  kleur: string;
  foto: string;
  icoon: React.ReactNode;
  titel: string;
  tekst: string;
  punten: string[];
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all">
      <div className="relative h-52 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={foto} alt={titel} className="w-full h-full object-cover" />
        <div
          className="absolute inset-0 opacity-30 mix-blend-multiply"
          style={{ background: kleur }}
        />
        <div
          className="absolute top-4 left-4 w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
          style={{ background: kleur }}
        >
          {icoon}
        </div>
      </div>
      <div className="p-7">
        <h3 className="text-xl font-black mb-3">{titel}</h3>
        <p className="text-gray-600 leading-relaxed mb-5 text-[15px]">{tekst}</p>
        <ul className="space-y-2">
          {punten.map((p) => (
            <li key={p} className="flex items-center gap-2 text-sm text-gray-700">
              <Check size={16} className="text-emerald-500 flex-shrink-0" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProductScherm({
  foto,
  titel,
  tekst,
}: {
  foto: string;
  titel: string;
  tekst: string;
}) {
  return (
    <div className="text-center">
      <div className="relative mb-6">
        <div
          aria-hidden
          className="absolute inset-x-0 -inset-y-4 bg-[#333399]/10 blur-2xl rounded-full"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto}
          alt={titel}
          className="relative mx-auto w-full max-w-[280px] drop-shadow-2xl"
        />
      </div>
      <h3 className="text-xl font-black mb-2">{titel}</h3>
      <p className="text-gray-600 leading-relaxed text-[15px] max-w-xs mx-auto">{tekst}</p>
    </div>
  );
}

function Feature({
  kleur,
  icoon,
  titel,
  tekst,
}: {
  kleur: string;
  icoon: React.ReactNode;
  titel: string;
  tekst: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#333399]/30 hover:shadow-xl transition-all">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4"
        style={{ background: kleur }}
      >
        {icoon}
      </div>
      <h3 className="text-lg font-bold mb-2">{titel}</h3>
      <p className="text-gray-600 leading-relaxed text-[14px]">{tekst}</p>
    </div>
  );
}

function Stap({
  nummer,
  titel,
  tekst,
}: {
  nummer: string;
  titel: string;
  tekst: string;
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-7 hover:bg-white/10 transition-all">
      <div className="text-6xl font-black text-[#ffd84d]/80 mb-4 leading-none">{nummer}</div>
      <h3 className="text-xl font-bold mb-3 text-white">{titel}</h3>
      <p className="text-white/70 leading-relaxed text-[15px]">{tekst}</p>
    </div>
  );
}

function Plan({
  naam,
  prijs,
  uitleg,
  kenmerken,
  populair,
}: {
  naam: string;
  prijs: string;
  uitleg: string;
  kenmerken: string[];
  populair?: boolean;
}) {
  return (
    <div
      className={`relative rounded-3xl p-7 ${
        populair
          ? "bg-gradient-to-br from-[#333399] to-[#1f1f5c] text-white shadow-2xl scale-105 border-2 border-[#ffd84d]"
          : "bg-white border border-gray-200 text-gray-900"
      }`}
    >
      {populair && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#ffd84d] text-[#333399] text-xs font-black px-4 py-1.5 rounded-full">
          MEEST GEKOZEN
        </div>
      )}
      <h3 className="text-2xl font-black mb-1">{naam}</h3>
      <div className={`text-sm mb-6 ${populair ? "text-white/70" : "text-gray-500"}`}>{uitleg}</div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold">€</span>
        <span className="text-5xl font-black">{prijs}</span>
      </div>
      <div className={`text-sm mb-7 ${populair ? "text-white/70" : "text-gray-500"}`}>per maand</div>
      <ul className="space-y-3 mb-8">
        {kenmerken.map((k) => (
          <li key={k} className="flex items-start gap-2.5 text-sm">
            <Check size={18} className={populair ? "text-[#ffd84d] flex-shrink-0 mt-0.5" : "text-emerald-500 flex-shrink-0 mt-0.5"} />
            <span className={populair ? "text-white/90" : "text-gray-700"}>{k}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        className={`block text-center font-bold px-6 py-3 rounded-xl transition ${
          populair
            ? "bg-[#ffd84d] hover:bg-white text-[#333399]"
            : "bg-[#333399] hover:bg-[#1f1f5c] text-white"
        }`}
      >
        Start nu
      </Link>
    </div>
  );
}

function Faq({ vraag, antwoord }: { vraag: string; antwoord: string }) {
  return (
    <details className="group bg-[#f5f5f7] hover:bg-gray-100 rounded-2xl p-5 cursor-pointer transition">
      <summary className="font-bold text-gray-900 flex items-center justify-between list-none">
        <span>{vraag}</span>
        <span className="text-[#333399] text-2xl group-open:rotate-45 transition-transform">+</span>
      </summary>
      <p className="text-gray-600 leading-relaxed mt-3 text-[15px]">{antwoord}</p>
    </details>
  );
}
