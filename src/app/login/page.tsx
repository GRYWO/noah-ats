import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; setter_abonnement?: string; bureau_abonnement?: string; reden?: string }>;
}) {
  const { error, setter_abonnement, bureau_abonnement, reden } = await searchParams;

  const melding = setter_abonnement === "actief"
    ? { kleur: "emerald", tekst: "Je abonnement is actief. Check je mail voor je inloggegevens." }
    : setter_abonnement === "geannuleerd"
    ? { kleur: "amber", tekst: "Betaling geannuleerd. Je kunt pas inloggen na een actief abonnement — check je mail voor de betaallink." }
    : setter_abonnement === "wachtend_betaling" || setter_abonnement === "proefperiode"
    ? { kleur: "amber", tekst: "Je proefperiode is afgelopen. Check je mail voor de betaallink om weer toegang te krijgen." }
    : setter_abonnement === "achterstallig"
    ? { kleur: "red", tekst: "Je abonnement heeft een achterstallige betaling. Werk je betaalmethode bij." }
    : setter_abonnement === "opgezegd"
    ? { kleur: "red", tekst: "Je abonnement is opgezegd. Mail info@noah-recruitment.nl om opnieuw te starten." }
    : bureau_abonnement === "geblokkeerd"
    ? { kleur: "red", tekst: "Het bureau-abonnement is geblokkeerd. Neem contact op met info@noah-recruitment.nl." }
    : reden === "ander_apparaat"
    ? { kleur: "amber", tekst: "Je bent uitgelogd omdat er op een ander apparaat is ingelogd met dit account." }
    : reden === "inactiviteit"
    ? { kleur: "amber", tekst: "Je bent automatisch uitgelogd na 60 minuten inactiviteit." }
    : null;

  const meldKleur =
    melding?.kleur === "emerald"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : melding?.kleur === "red"
      ? "border-red-400/30 bg-red-400/10 text-red-200"
      : "border-amber-400/30 bg-amber-400/10 text-amber-200";

  return (
    <main className="night-gold flex min-h-screen flex-col items-center justify-center px-5 py-12 text-white">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            Noah<span className="text-gold">.</span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">ATS</span>
        </span>
      </div>

      <div className="w-full max-w-md">
        <div className="gold-edge rounded-3xl bg-white/[0.04] p-8 sm:p-10">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Inloggen</h1>
          <p className="mt-2 text-sm text-white/60">Welkom terug. Log in om je Noah-omgeving te beheren.</p>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {melding && (
            <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${meldKleur}`}>{melding.tekst}</div>
          )}

          <form action={login} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/75">E-mailadres</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="off"
                placeholder="voornaam@noah-recruitment.nl"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-gold/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-white/75">Wachtwoord</span>
              <input
                type="password"
                name="password"
                required
                autoComplete="off"
                defaultValue=""
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-white placeholder-white/30 outline-none transition focus:border-gold/60"
              />
            </label>
            <button type="submit" className="btn-gold w-full px-6 py-3.5 text-base">
              Inloggen
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link href="/wachtwoord-vergeten" className="text-white/55 transition hover:text-white">
              Wachtwoord vergeten?
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
