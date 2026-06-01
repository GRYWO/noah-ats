import Link from "next/link";
import Image from "next/image";
import { login } from "./actions";
import { ShieldCheck, MapPin, BadgeCheck } from "lucide-react";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setter_abonnement?: string; reden?: string }>;
}) {
  const { error, setter_abonnement, reden } = await searchParams;

  const setterMelding = setter_abonnement === "actief"
    ? { kleur: "emerald", tekst: "✅ Je abonnement is actief! Check je mail voor je inloggegevens." }
    : setter_abonnement === "geannuleerd"
    ? { kleur: "amber", tekst: "⚠ Betaling geannuleerd. Je kan pas inloggen na een actief abonnement — check je mail voor de betaallink." }
    : setter_abonnement === "wachtend_betaling"
    ? { kleur: "amber", tekst: "⚠ Je abonnement is nog niet betaald. Check je mail voor de Stripe-betaallink." }
    : setter_abonnement === "achterstallig"
    ? { kleur: "red", tekst: "⚠ Je abonnement heeft een achterstallige betaling. Werk je betaalmethode bij via Stripe." }
    : setter_abonnement === "opgezegd"
    ? { kleur: "red", tekst: "Je abonnement is opgezegd. Neem contact op met info@grywo.nl om opnieuw te starten." }
    : reden === "ander_apparaat"
    ? { kleur: "amber", tekst: "🔐 Je bent uitgelogd omdat er op een ander apparaat is ingelogd met dit account." }
    : reden === "inactiviteit"
    ? { kleur: "amber", tekst: "⏱ Je bent automatisch uitgelogd na 60 minuten inactiviteit." }
    : null;

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0f0f23] text-white flex flex-col">
      {/* Gradient achtergrond — paars → donker */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
      />
      {/* Subtiele radial highlight bovenin */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(255,216,77,0.25) 0%, rgba(51,51,153,0) 60%)",
        }}
      />

      {/* Header — klein GRYWO logo */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link href="/" className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition">
          <span>Powered by</span>
          <Image
            src="/grywo-logo-wit.png"
            alt="GRYWO"
            width={70}
            height={20}
            className="opacity-90"
          />
        </Link>
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Noah is online
        </div>
      </header>

      {/* Login card */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        {/* Noah-logo block */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl px-10 py-8 mb-8 flex items-baseline">
          <span className="text-white text-5xl md:text-6xl font-black tracking-tighter">
            noah
          </span>
          <span className="ml-2 w-4 h-4 rounded-full bg-[#ffd84d] inline-block" />
        </div>

        {/* Form card */}
        <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Welkom terug</h1>
          <p className="text-white/60 text-sm mb-6">Log in met je e-mailadres</p>

          {error && (
            <div className="bg-red-500/10 border border-red-400/40 text-red-200 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {setterMelding && (
            <div className={`text-sm rounded-lg p-3 mb-4 border ${
              setterMelding.kleur === "emerald" ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-200" :
              setterMelding.kleur === "amber" ? "bg-amber-500/10 border-amber-400/40 text-amber-200" :
              "bg-red-500/10 border-red-400/40 text-red-200"
            }`}>
              {setterMelding.tekst}
            </div>
          )}

          <form action={login} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
                E-mailadres
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="off"
                placeholder="voorbeeld@grywo.nl"
                className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg focus:outline-none focus:border-[#ffd84d] focus:bg-white/10 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
                Wachtwoord
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="off"
                defaultValue=""
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/15 text-white placeholder-white/30 rounded-lg focus:outline-none focus:border-[#ffd84d] focus:bg-white/10 transition"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white hover:bg-white/90 text-[#333399] font-bold py-3 rounded-lg shadow-lg transition-all hover:shadow-2xl hover:-translate-y-0.5"
            >
              Inloggen →
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/wachtwoord-vergeten"
              className="text-xs text-white/50 hover:text-white/80 transition"
            >
              Wachtwoord vergeten?
            </Link>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          <TrustBadge icon={<ShieldCheck size={12} />} label="AVG-proof" />
          <TrustBadge icon={<MapPin size={12} />} label="Made in NL" />
          <TrustBadge icon={<BadgeCheck size={12} />} label="ISO-ready" />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-6 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782
      </footer>
    </main>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm text-[11px] text-white/80">
      <span className="text-[#ffd84d]">{icon}</span>
      {label}
    </div>
  );
}
