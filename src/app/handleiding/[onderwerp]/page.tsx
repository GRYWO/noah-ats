import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { HOOFDSTUKKEN } from "../data";

const KLEUREN: Record<string, { bg: string; tekst: string }> = {
  paars:  { bg: "#ddd6fe", tekst: "#5b21b6" },
  groen:  { bg: "#dcfce7", tekst: "#15803d" },
  geel:   { bg: "#fef3c7", tekst: "#92400e" },
  blauw:  { bg: "#dbeafe", tekst: "#1d4ed8" },
  rood:   { bg: "#fee2e2", tekst: "#991b1b" },
  oranje: { bg: "#ffedd5", tekst: "#9a3412" },
  roze:   { bg: "#fce7f3", tekst: "#9d174d" },
  cyaan:  { bg: "#cffafe", tekst: "#155e75" },
};

const CALLOUT_STIJL = {
  info:    { bg: "bg-blue-50",    rand: "border-blue-300",    tekst: "text-blue-900",    label: "ℹ Info" },
  "let-op":{ bg: "bg-amber-50",   rand: "border-amber-300",   tekst: "text-amber-900",   label: "⚠ Let op" },
  tip:     { bg: "bg-emerald-50", rand: "border-emerald-300", tekst: "text-emerald-900", label: "💡 Tip" },
} as const;

export function generateStaticParams() {
  return HOOFDSTUKKEN.map((h) => ({ onderwerp: h.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ onderwerp: string }> }) {
  const { onderwerp } = await params;
  const h = HOOFDSTUKKEN.find((x) => x.slug === onderwerp);
  if (!h) return { title: "Niet gevonden" };
  return {
    title: `${h.titel} — Noah-ATS handleiding`,
    description: h.intro,
  };
}

export default async function HoofdstukPage({
  params,
}: {
  params: Promise<{ onderwerp: string }>;
}) {
  const { onderwerp } = await params;
  const h = HOOFDSTUKKEN.find((x) => x.slug === onderwerp);
  if (!h) notFound();

  const k = KLEUREN[h.kleur];
  const index = HOOFDSTUKKEN.findIndex((x) => x.slug === onderwerp);
  const vorig = index > 0 ? HOOFDSTUKKEN[index - 1] : null;
  const volgend = index < HOOFDSTUKKEN.length - 1 ? HOOFDSTUKKEN[index + 1] : null;

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-gray-900">
      {/* Header — paars */}
      <header className="bg-gradient-to-br from-[#1f1f5c] via-[#333399] to-[#1f1f5c] text-white">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 md:py-14">
          <div className="flex items-center justify-between mb-10">
            <Link
              href="/handleiding"
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-[#ffd84d] transition"
            >
              ← Alle hoofdstukken
            </Link>
            <Link href="/" className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition">
              <span>Powered by</span>
              <Image src="/grywo-logo-wit.png" alt="Noah recruitment" width={70} height={20} className="opacity-90" />
            </Link>
          </div>

          {/* Noah-mini-logo */}
          <Link href="/handleiding" className="inline-flex items-baseline mb-8 group">
            <span className="text-white text-3xl font-black tracking-tighter group-hover:opacity-90 transition">
              noah
            </span>
            <span className="ml-2 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block" />
            <span className="ml-3 text-white/50 text-sm font-medium">/ handleiding</span>
          </Link>

          <div className="flex items-start gap-5">
            <span
              className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl text-4xl md:text-5xl flex-shrink-0"
              style={{ background: k.bg, color: k.tekst }}
            >
              {h.icoon}
            </span>
            <div>
              <div className="text-[#ffd84d] text-sm font-mono mb-2">Hoofdstuk {h.nummer}</div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">{h.titel}</h1>
              <p className="text-lg text-white/80 leading-relaxed">{h.intro}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Inhoud */}
      <article className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {h.secties.map((s, i) => {
          const callout = s.callout ? CALLOUT_STIJL[s.callout.type] : null;
          return (
            <section key={i} className="mb-12 last:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-5 text-gray-900">
                {s.kop}
              </h2>
              {s.tekst.map((p, j) => (
                <p key={j} className="text-gray-700 leading-relaxed mb-4 text-[17px]">
                  {p}
                </p>
              ))}
              {s.lijst && (
                <ul className="space-y-3 mt-5 mb-5">
                  {s.lijst.map((l, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-3 bg-white rounded-xl p-4 border border-gray-100"
                    >
                      <span className="text-[#ffd84d] text-xl mt-0.5">•</span>
                      <span className="text-gray-700 text-[16px] leading-relaxed">{l}</span>
                    </li>
                  ))}
                </ul>
              )}
              {callout && s.callout && (
                <div
                  className={`mt-5 rounded-2xl border-2 ${callout.bg} ${callout.rand} p-5`}
                >
                  <div className={`text-xs font-bold uppercase mb-1.5 ${callout.tekst}`}>
                    {callout.label}
                  </div>
                  <div className={`${callout.tekst} text-[16px] leading-relaxed`}>
                    {s.callout.tekst}
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {/* Navigatie naar vorige/volgende */}
        <nav className="grid grid-cols-2 gap-3 mt-16 pt-10 border-t border-gray-200">
          {vorig ? (
            <Link
              href={`/handleiding/${vorig.slug}`}
              className="group bg-white hover:bg-[#333399] hover:text-white rounded-2xl p-5 border border-gray-200 transition-all"
            >
              <div className="text-xs text-gray-400 mb-1 group-hover:text-white/70">
                ← Hoofdstuk {vorig.nummer}
              </div>
              <div className="font-semibold text-gray-900 group-hover:text-white">
                {vorig.titel}
              </div>
            </Link>
          ) : (
            <div />
          )}
          {volgend ? (
            <Link
              href={`/handleiding/${volgend.slug}`}
              className="group bg-white hover:bg-[#333399] hover:text-white rounded-2xl p-5 border border-gray-200 text-right transition-all"
            >
              <div className="text-xs text-gray-400 mb-1 group-hover:text-white/70">
                Hoofdstuk {volgend.nummer} →
              </div>
              <div className="font-semibold text-gray-900 group-hover:text-white">
                {volgend.titel}
              </div>
            </Link>
          ) : (
            <Link
              href="/handleiding"
              className="group bg-[#333399] hover:bg-[#1f1f5c] text-white rounded-2xl p-5 text-right transition-all"
            >
              <div className="text-xs text-white/70 mb-1">Klaar 🎉</div>
              <div className="font-semibold">Terug naar inhoudsopgave</div>
            </Link>
          )}
        </nav>
      </article>

      <footer className="bg-[#0f0f23] text-white/40 text-xs text-center py-6">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782 · Noah-ATS is een product van Noah recruitment
      </footer>
    </main>
  );
}
