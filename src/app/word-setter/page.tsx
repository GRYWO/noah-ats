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
} from "lucide-react";

export const metadata = {
  title: "Word setter bij GRYWO — Sales-vacature recruitment",
  description:
    "Word onderdeel van GRYWO en verdien aan elke plaatsing. Volledig opgeleid, AI-gedreven ATS, vast salaris + bonus. Solliciteer direct.",
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
            <Image src="/grywo-logo-wit.png" alt="GRYWO" width={70} height={20} className="opacity-90" />
          </div>
        </header>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd84d]/10 border border-[#ffd84d]/30 text-[#ffd84d] text-sm font-semibold mb-6">
            <Sparkles size={14} /> Vacature — Sales / Recruitment Setter
          </div>

          <h1 className="text-4xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Word setter bij{" "}
            <span className="text-[#ffd84d]">GRYWO.</span>
          </h1>

          <p className="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Verdien aan elke kandidaat die je plaatst. Volledig opgeleid, het beste AI-systeem
            van Nederland, en een team dat je elke dag scherp houdt.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:info@grywo.nl?subject=Setter%20worden%20bij%20GRYWO"
              className="bg-[#ffd84d] hover:bg-white text-[#333399] font-bold px-10 py-4 rounded-xl shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Solliciteren <ArrowRight size={18} />
            </a>
            <a
              href="#wat-je-doet"
              className="text-white/80 hover:text-white font-semibold px-6 py-4 transition"
            >
              Wat je gaat doen ↓
            </a>
          </div>

          <p className="mt-8 text-white/50 text-sm">
            Geen ervaring nodig · Vast salaris + bonus · Werken vanaf elke plek
          </p>
        </div>
      </section>

      {/* ─── WAT IS GRYWO ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
            Wie wij zijn
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
            GRYWO bouwt het{" "}
            <span className="text-[#333399]">slimste recruitmentbureau</span>{" "}
            van Nederland.
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed mb-4">
            We combineren ervaren recruiters, een eigen AI-gedreven ATS (Noah) en een team
            van setters dat alle leads zelf binnenhaalt. Geen dubbel werk, geen vage targets —
            jij belt, wij regelen de rest.
          </p>
          <p className="text-gray-600 text-lg leading-relaxed">
            Klanten kiezen GRYWO omdat we sneller leveren dan elk ander bureau.
            Setters kiezen ons omdat ze met betere tooling méér verdienen.
          </p>
        </div>
      </section>

      {/* ─── WAT JE GAAT DOEN ─── */}
      <section id="wat-je-doet" className="py-20 bg-[#f5f5f7]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-sm font-bold text-[#333399] uppercase tracking-wider mb-3">
              Wat je gaat doen
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">Je dag bij GRYWO</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Geen complexiteit. Geen administratie. Alleen gesprekken die geld opleveren.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Stap
              icoon={<PhoneCall size={28} />}
              kleur="#3b82f6"
              nummer="1"
              titel="Bellen"
              tekst="Je krijgt een vacature van een kandidaat en belt met opdrachtgevers uit jouw bellijst. Geen koude acquisitie — alle leads zijn voorgekauwd."
            />
            <Stap
              icoon={<Target size={28} />}
              kleur="#a855f7"
              nummer="2"
              titel="Voorstellen"
              tekst="Eén klik in Noah → kandidaat is voorgesteld aan de opdrachtgever. Robin (onze AI) schrijft de begeleidende tekst zelf in jouw stem."
            />
            <Stap
              icoon={<TrendingUp size={28} />}
              kleur="#10b981"
              nummer="3"
              titel="Plaatsen + verdienen"
              tekst="Kandidaat zegt ja → recruiter handelt af → jij krijgt bonus op elke plaatsing. Hoe meer je belt, hoe meer je verdient."
            />
          </div>
        </div>
      </section>

      {/* ─── WAT JE KRIJGT ─── */}
      <section className="py-20 bg-white">
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
              titel="Vast salaris + bonus per plaatsing"
              tekst="Basisgarantie elke maand. Bovenop dat: bonus voor élke kandidaat die wordt geplaatst."
            />
            <Voordeel
              icoon={<Sparkles />}
              titel="Het beste ATS van Nederland"
              tekst="Noah met Robin AI en Jobdigger. Schrijft voorstellen voor je, vult bellijsten automatisch."
            />
            <Voordeel
              icoon={<Users />}
              titel="Volledige opleiding + coaching"
              tekst="Dagelijkse EOD-coaching, persoonlijke records, eigen doelen. Je groeit elke week."
            />
            <Voordeel
              icoon={<CalendarClock />}
              titel="Werk vanaf elke plek"
              tekst="Thuis, op kantoor, op het strand met wifi. Zolang je belt, ben je vrij."
            />
            <Voordeel
              icoon={<ShieldCheck />}
              titel="Geen administratieve rompslomp"
              tekst="Contracten, facturen, voorstellen — alles automatisch via Noah. Jij belt."
            />
            <Voordeel
              icoon={<TrendingUp />}
              titel="Doorgroei naar recruiter"
              tekst="Als je het goed doet, kun je doorgroeien naar recruiter. Hoger basissalaris, meer regie."
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

      {/* ─── QUOTE ─── */}
      <section className="py-20 bg-[#f5f5f7]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="text-6xl text-[#333399] mb-4 font-serif leading-none">"</div>
          <p className="text-2xl md:text-4xl font-bold leading-tight mb-6 text-gray-900">
            Bij GRYWO ben je geen nummer.{" "}
            <span className="text-[#333399]">Je bent onderdeel van het team.</span>
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <div className="w-12 h-12 rounded-full bg-[#333399] text-white font-bold flex items-center justify-center">
              YH
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Yorith Hulzebosch</div>
              <div className="text-sm text-gray-500">Oprichter GRYWO</div>
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
            Stuur een mail met je CV (of LinkedIn) naar info@grywo.nl. Binnen 2 werkdagen
            heb je een eerste kennismaking — geen lange procedures.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:info@grywo.nl?subject=Setter%20worden%20bij%20GRYWO"
              className="bg-[#ffd84d] hover:bg-white text-[#333399] font-bold px-10 py-4 rounded-xl shadow-2xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Mail info@grywo.nl <ArrowRight size={18} />
            </a>
            <a
              href="tel:0854016082"
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-semibold px-8 py-4 rounded-xl transition"
            >
              Of bel 085-4016082
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0f0f23] text-white/40 text-xs text-center py-6">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782 · Noah-ATS is een product van GRYWO
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
