import Link from "next/link";
import Image from "next/image";
import {
  PhoneCall,
  Target,
  Sparkles,
  CalendarClock,
  CreditCard,
  Users,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Check,
  MessageCircle,
  Flame,
  ListChecks,
  Phone,
  Handshake,
  Trophy,
} from "lucide-react";

const WA_BERICHT = encodeURIComponent(
  "Hoi Pepijn, ik heb interesse in de setter-positie bij Noah recruitment. Kunnen we even sparren?",
);
const WA_LINK = `https://wa.me/31683481303?text=${WA_BERICHT}`;

export const metadata = {
  title: "Word setter bij Noah recruitment — Sales-vacature recruitment",
  description:
    "Word onderdeel van Noah recruitment en verdien aan elke plaatsing. Volledig opgeleid, AI-gedreven ATS, vast salaris + bonus. Solliciteer direct.",
};

export default function WordSetter() {
  return (
    <main className="bg-white text-gray-900 overflow-hidden">
      {/* ─── HERO ─── */}
      <section className="relative bg-[#0f0f23] text-white overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
        />
        <div
          aria-hidden
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(255,216,77,0.3) 0%, rgba(51,51,153,0) 60%)",
          }}
        />

        <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-baseline">
            <span className="text-white text-2xl font-black tracking-tighter">noah</span>
            <span className="ml-1.5 w-2 h-2 rounded-full bg-[#ffd84d] inline-block" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span>Powered by</span>
            <Image src="/grywo-logo-wit.png" alt="Noah recruitment" width={70} height={20} className="opacity-90" />
          </div>
        </header>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd84d]/10 border border-[#ffd84d]/30 text-[#ffd84d] text-sm font-semibold mb-6">
            <Sparkles size={14} /> Vacature — Sales / Recruitment Setter
          </div>

          <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Word setter bij{" "}
            <span className="text-[#ffd84d]">Noah recruitment.</span>
          </h1>

          <p className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Verdien aan elke kandidaat die je plaatst. Volledig opgeleid, AI-gestuurd
            recruitment en een team dat je elke dag scherp houdt.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold px-10 py-4 rounded-xl shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              <MessageCircle size={18} /> WhatsApp Pepijn
            </a>
            <a
              href="#wat-je-doet"
              className="text-white/80 hover:text-white font-semibold px-6 py-4 transition"
            >
              Wat je gaat doen ↓
            </a>
          </div>

          <p className="mt-8 text-white/50 text-sm">
            7-daagse trial · Eigen zakelijk e-mailadres · Eigen Voys-nummer na trial
          </p>
        </div>
      </section>

      {/* ─── WAT IS NOAH RECRUITMENT ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
            Wie wij zijn
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
            Noah recruitment doet recruitment{" "}
            <span className="text-[#333399]">AI-gestuurd.</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            We combineren ervaren recruiters, ons eigen AI-systeem (Noah) en een team
            van setters dat alle leads zelf binnenhaalt. Geen dubbel werk, geen vage targets —
            jij belt, wij regelen de rest.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            Klanten kiezen Noah recruitment omdat we sneller leveren dan elk ander bureau.
            Setters kiezen ons omdat ze met betere tooling méér verdienen.
          </p>
        </div>
      </section>

      {/* ─── WAT JE GAAT DOEN ─── */}
      <section id="wat-je-doet" className="py-20 bg-[#f5f5f7]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              De setter-flow
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">Zo werkt het bij ons</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Geen koude acquisitie. Geen administratie. Alleen gesprekken die geld opleveren.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-4">
            <Stap
              icoon={<Flame size={24} />}
              kleur="#ef4444"
              nummer="1"
              titel="Warme lead"
              tekst="Recruiter levert een kandidaat aan met al ingevulde profielinfo."
            />
            <Stap
              icoon={<ListChecks size={24} />}
              kleur="#3b82f6"
              nummer="2"
              titel="Bellijst — 1 klik"
              tekst="In Noah-ATS druk je op één knop. Bellijst met opdrachtgevers staat direct klaar."
            />
            <Stap
              icoon={<Phone size={24} />}
              kleur="#f59e0b"
              nummer="3"
              titel="Bellen + voorstellen"
              tekst="Voorstellen de kandidaat zo vaak mogelijk. Nog beter: plan direct een afspraak in."
            />
            <Stap
              icoon={<Handshake size={24} />}
              kleur="#a855f7"
              nummer="4"
              titel="Gesprek"
              tekst="Het kennismakingsgesprek tussen kandidaat en opdrachtgever vindt plaats."
            />
            <Stap
              icoon={<Trophy size={24} />}
              kleur="#10b981"
              nummer="5"
              titel="Plaatsing"
              tekst="Kandidaat geplaatst → jij krijgt de bonus. Geen administratie, recruiter regelt de rest."
            />
          </div>
        </div>
      </section>

      {/* ─── 7-DAAGSE TRIAL ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
            7-Daagse trial
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
            Eerst <span className="text-[#333399]">7 dagen</span> proberen, daarna pas tekenen.
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            We willen weten of we bij elkaar passen. In de 7-daagse trial krijg je alles
            wat een setter nodig heeft — geen rare voorwaarden.
          </p>

          <div className="grid md:grid-cols-2 gap-5 text-left">
            <div className="bg-[#f5f5f7] rounded-2xl p-6">
              <div className="text-xs font-bold text-[#333399] uppercase tracking-wider mb-2">
                Tijdens de trial (dag 1-7)
              </div>
              <ul className="space-y-3 text-gray-700 text-[15px]">
                <li className="flex items-start gap-2"><Check size={18} className="text-[#333399] flex-shrink-0 mt-0.5" /> Zakelijk e-mailadres <b>voornaam@grywo.nl</b></li>
                <li className="flex items-start gap-2"><Check size={18} className="text-[#333399] flex-shrink-0 mt-0.5" /> Eigen omgeving in Noah-ATS</li>
                <li className="flex items-start gap-2"><Check size={18} className="text-[#333399] flex-shrink-0 mt-0.5" /> Volledige toegang tot Jobdigger + Robin AI</li>
                <li className="flex items-start gap-2"><Check size={18} className="text-[#333399] flex-shrink-0 mt-0.5" /> Coaching van Pepijn vanaf dag 1</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-[#333399] to-[#1f1f5c] text-white rounded-2xl p-6">
              <div className="text-xs font-bold text-[#ffd84d] uppercase tracking-wider mb-2">
                Na de trial (dag 8+)
              </div>
              <ul className="space-y-3 text-white/90 text-[15px]">
                <li className="flex items-start gap-2"><Check size={18} className="text-[#ffd84d] flex-shrink-0 mt-0.5" /> Eigen <b>Voys-telefoonnummer</b></li>
                <li className="flex items-start gap-2"><Check size={18} className="text-[#ffd84d] flex-shrink-0 mt-0.5" /> Onbeperkt gratis bellen, vanaf elke locatie</li>
                <li className="flex items-start gap-2"><Check size={18} className="text-[#ffd84d] flex-shrink-0 mt-0.5" /> Doorlopend basissalaris + bonus per plaatsing</li>
                <li className="flex items-start gap-2"><Check size={18} className="text-[#ffd84d] flex-shrink-0 mt-0.5" /> Vaste plek in het Noah recruitment-team</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WAT JE KRIJGT ─── */}
      <section className="py-20 bg-[#f5f5f7]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              Wat je krijgt
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">Geen lege beloftes</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <Voordeel
              icoon={<CreditCard />}
              titel="Basissalaris + bonus per plaatsing"
              tekst="Vast bedrag elke maand. Bovenop dat: bonus voor élke kandidaat die wordt geplaatst."
            />
            <Voordeel
              icoon={<Sparkles />}
              titel="AI-gestuurd recruitment"
              tekst="Noah met Robin AI en Jobdigger. Schrijft voorstellen voor je, vult bellijsten automatisch."
            />
            <Voordeel
              icoon={<Phone />}
              titel="Eigen Voys-telefoonnummer"
              tekst="Onbeperkt gratis bellen vanaf elke locatie. Krijg je na de 7-daagse trial."
            />
            <Voordeel
              icoon={<CalendarClock />}
              titel="Werk vanaf elke plek"
              tekst="Thuis, op kantoor, op het strand met wifi. Zolang je belt, ben je vrij."
            />
            <Voordeel
              icoon={<Users />}
              titel="Dagelijkse coaching"
              tekst="Pepijn (jouw coach) belt en spart elke dag mee. Persoonlijke records, eigen doelen. Je groeit elke week."
            />
            <Voordeel
              icoon={<ShieldCheck />}
              titel="Geen administratieve rompslomp"
              tekst="Contracten, facturen, voorstellen — alles automatisch via Noah. Jij belt."
            />
          </div>
        </div>
      </section>

      {/* ─── WAT WIJ VAN JOU VERWACHTEN ─── */}
      <section className="py-20 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23] text-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-sm font-bold text-[#ffd84d] uppercase tracking-wider mb-3">
              Wat wij van jou verwachten
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">Eerlijk: wat we zoeken</h2>
          </div>

          <ul className="space-y-3">
            {[
              "Je vindt het leuk om te bellen en bent niet bang voor 'nee'.",
              "Je bent leergierig en wilt elke dag een beetje beter worden.",
              "Je staat open voor coaching en doet er ook iets mee.",
              "Je werkt graag in een team, maar kunt ook zelfstandig knallen.",
              "Je hebt MBO-werk- en denkniveau (HBO is mooi, niet vereist).",
              "Je beheerst Nederlands native of bijna-native — telefonisch overtuigend.",
            ].map((e) => (
              <li key={e} className="flex items-start gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
                <Check size={20} className="text-[#ffd84d] flex-shrink-0 mt-0.5" />
                <span className="text-white/90 leading-relaxed">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── QUOTE PEPIJN ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-6xl text-[#333399] mb-4 font-serif leading-none">"</div>
          <p className="text-2xl md:text-4xl font-bold leading-tight mb-6 text-gray-900">
            Bij Noah recruitment ben je geen nummer.{" "}
            <span className="text-[#333399]">Ik help je dagelijks om beter te worden.</span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-12 h-12 rounded-full bg-[#333399] text-white font-bold flex items-center justify-center">
              PZ
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Pepijn Zwartenberg</div>
              <div className="text-sm text-gray-500">Coach setters · Noah recruitment</div>
            </div>
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
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
            Klaar om setter te worden?
          </h2>
          <p className="text-lg md:text-xl text-white/70 mb-10 max-w-xl mx-auto">
            Stuur een whatsapp-bericht naar je toekomstige coach Pepijn. Hij belt je
            persoonlijk terug — geen lange procedures.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold px-10 py-4 rounded-xl shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              <MessageCircle size={18} /> WhatsApp Pepijn
            </a>
            <a
              href="tel:+31683481303"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition inline-flex items-center gap-2"
            >
              <Phone size={18} /> Of bel direct: 06-83481303
            </a>
          </div>
        </div>
      </section>


      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0f0f23] text-white/40 text-xs text-center py-6">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782 · Noah-ATS is een product van Noah recruitment
      </footer>
    </main>
  );
}

function Stap({
  icoon,
  kleur,
  nummer,
  titel,
  tekst,
}: {
  icoon: React.ReactNode;
  kleur: string;
  nummer: string;
  titel: string;
  tekst: string;
}) {
  return (
    <div className="bg-white rounded-3xl p-7 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all relative">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5"
        style={{ background: kleur }}
      >
        {icoon}
      </div>
      <div className="text-5xl font-black absolute top-7 right-7 opacity-10">{nummer}</div>
      <h3 className="text-xl font-black mb-2">{titel}</h3>
      <p className="text-gray-600 leading-relaxed text-[15px]">{tekst}</p>
    </div>
  );
}

function Voordeel({
  icoon,
  titel,
  tekst,
}: {
  icoon: React.ReactNode;
  titel: string;
  tekst: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#333399]/30 hover:shadow-xl transition-all flex gap-4">
      <div className="w-11 h-11 rounded-xl bg-[#333399]/10 text-[#333399] flex items-center justify-center flex-shrink-0">
        {icoon}
      </div>
      <div>
        <h3 className="text-base font-bold mb-1">{titel}</h3>
        <p className="text-gray-600 leading-relaxed text-[14px]">{tekst}</p>
      </div>
    </div>
  );
}
