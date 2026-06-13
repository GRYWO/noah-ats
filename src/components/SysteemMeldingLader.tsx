import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { SysteemMeldingBanner } from "./SysteemMeldingBanner";

/**
 * Server component dat de actieve systeem-melding ophaalt en aan de
 * client-banner doorgeeft. Wordt gerenderd in de root-layout zodat het
 * op elke ingelogde pagina verschijnt.
 *
 * Checkt of de huidige user de actieve melding al heeft weggeklikt
 * (dismissed_systeem_meldingen tabel) — zo ja, dan tonen we 'm niet meer
 * op welk apparaat dan ook.
 */
export async function SysteemMeldingLader() {
  // Alleen tonen aan ingelogde gebruikers (geen banner op /login etc)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: melding } = await admin
    .from("systeem_meldingen")
    .select("id, type, titel, bericht, aangemaakt_op")
    .eq("actief", true)
    .order("aangemaakt_op", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!melding) return <SysteemMeldingBanner melding={null} />;

  // Heeft deze user de melding al weggeklikt? Dan niet tonen.
  const { data: dismiss } = await admin
    .from("dismissed_systeem_meldingen")
    .select("dismissed_op")
    .eq("user_id", user.id)
    .eq("melding_id", melding.id)
    .maybeSingle();

  if (dismiss) return <SysteemMeldingBanner melding={null} />;

  return <SysteemMeldingBanner melding={melding} />;
}
