import { createClient } from "@/utils/supabase/server";
import { werkdagenSinds } from "@/utils/voorstel-log";

/**
 * Banner voor setters in proefperiode — laat zien hoeveel werkdagen
 * er nog over zijn voor de Stripe-betaling moet starten.
 *
 * Toont alleen iets als de gebruiker een setter is met status="proefperiode".
 */
export async function ProefperiodeBanner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, abonnement_status, proefperiode_eindigt_op")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.rol !== "setter" ||
    profile.abonnement_status !== "proefperiode" ||
    !profile.proefperiode_eindigt_op
  ) {
    return null;
  }

  const eind = new Date(profile.proefperiode_eindigt_op);
  const nu = new Date();
  if (eind <= nu) return null; // verlopen — middleware regelt al de blokkade

  // Aantal werkdagen tot einde
  const werkdagenOver = werkdagenSinds(nu.toISOString(), eind);
  const dagenLabel = werkdagenOver === 1 ? "werkdag" : "werkdagen";

  const kleurKlasse = werkdagenOver <= 1
    ? "bg-red-50 border-red-300 text-red-900"
    : werkdagenOver <= 2
    ? "bg-amber-50 border-amber-300 text-amber-900"
    : "bg-blue-50 border-blue-300 text-blue-900";

  return (
    <div className={`border-b-2 ${kleurKlasse}`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱</span>
          <span>
            <b>Proefperiode:</b> nog <b>{werkdagenOver} {dagenLabel}</b> tot je
            abonnement-mail wordt verstuurd.
          </span>
        </div>
        <span className="text-xs opacity-75 hidden md:inline">
          Daarna kun je via Stripe je setter-stoel activeren (€250/mnd).
        </span>
      </div>
    </div>
  );
}
