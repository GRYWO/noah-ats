import Link from "next/link";
import { HOOFDSTUKKEN } from "./data";

export const metadata = {
  title: "Noah-ATS handleiding — Hoe alles in elkaar zit",
  description:
    "Volledig boekwerk over Noah-ATS — rollen, flows, beveiliging, AI, Stripe en meer. Powered by Noah recruitment.",
};

const KLEUREN: Record<string, { bg: string; tekst: string; rand: string }> = {
  paars:  { bg: "#ddd6fe", tekst: "#5b21b6", rand: "#a78bfa" },
  groen:  { bg: "#dcfce7", tekst: "#15803d", rand: "#86efac" },
  geel:   { bg: "#fef3c7", tekst: "#92400e", rand: "#fcd34d" },
  blauw:  { bg: "#dbeafe", tekst: "#1d4ed8", rand: "#93c5fd" },
  rood:   { bg: "#fee2e2", tekst: "#991b1b", rand: "#fca5a5" },
  oranje: { bg: "#ffedd5", tekst: "#9a3412", rand: "#fdba74" },
  roze:   { bg: "#fce7f3", tekst: "#9d174d", rand: "#f9a8d4" },
  cyaan:  { bg: "#cffafe", tekst: "#155e75", rand: "#67e8f9" },
};

export default function HandleidingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0f0f23] text-white">
      {/* Achtergrond — paarse gradient */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
      />
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full opacity-25 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,216,77,0.25) 0%, rgba(51,51,153,0) 60%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pt-12 pb-8">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition"
          >
            <span>Powered by</span>
            <span className="text-base font-extrabold tracking-tight text-white">
              Noah<span className="text-[#ffd84d]">.</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">
              RECRUITMENT
            </span>
          </Link>
          <div className="text-xs text-white/50">
            Handleiding · {new Date().getFullYear()}
          </div>
        </div>

        {/* Noah-logo */}
        <div className="flex items-baseline mb-6">
          <span className="text-white text-6xl md:text-8xl font-black tracking-tighter">
            noah
          </span>
          <span className="ml-3 w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#ffd84d] inline-block" />
        </div>

        <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
          Hoe alles in elkaar zit
        </h1>
        <p className="text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
          Het volledige boekwerk over Noah-ATS — alle rollen, flows, beveiliging,
          AI-functies en de tijdlijn van wat wanneer is gebouwd. Klik op een
          hoofdstuk om te beginnen.
        </p>
      </header>

      {/* Hoofdstukken-grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {HOOFDSTUKKEN.map((h) => {
            const k = KLEUREN[h.kleur];
            return (
              <Link
                key={h.slug}
                href={`/handleiding/${h.slug}`}
                className="group bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 hover:border-[#ffd84d]/40 rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <span
                    className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-3xl"
                    style={{ background: k.bg, color: k.tekst }}
                  >
                    {h.icoon}
                  </span>
                  <span className="text-white/40 text-sm font-mono">
                    {h.nummer}
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-2 group-hover:text-[#ffd84d] transition">
                  {h.titel}
                </h2>
                <p className="text-white/70 text-sm leading-relaxed mb-4">
                  {h.intro}
                </p>
                <div className="text-[#ffd84d] text-sm font-semibold opacity-0 group-hover:opacity-100 transition">
                  Lees verder →
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quote-blok */}
        <div className="mt-16 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 text-center">
          <p className="text-2xl md:text-3xl font-bold leading-snug mb-3">
            "Recruitment op autopilot. De toekomst zit hier.{" "}
            <span className="text-[#ffd84d]">AI-gedreven ATS.</span>"
          </p>
          <p className="text-white/60 text-sm">
            — Yorith Hulzebosch, oprichter
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-8 text-center text-[11px] text-white/40 border-t border-white/10">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782 · Noah-ATS
        is een product van Noah recruitment
      </footer>
    </main>
  );
}
