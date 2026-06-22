import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { verplaatsKandidaat } from "@/app/vacature-aanmaken/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================================
// Klikbare E2E-test van de setter-flow in de ATS.
//
// Draait de ECHTE flow-acties (verplaatsen door de pijplijn + plaatsing), maar
// met de mail-dry-run aan: er gaat GEEN enkele echte e-mail uit. De test laat
// per stap zien of het goed gaat en welke mails "verstuurd zouden zijn" (naar
// wie). Daarna ruimt hij alle testdata weer op.
//
// Alleen voor super-admins.
// ============================================================================

const MARK = "[FLOWTEST]";

type Stap = { naam: string; ok: boolean; detail: string };
type MailGlobals = {
  __NOAH_MAIL_DRYRUN?: boolean;
  __NOAH_MAIL_CAPTURED?: Array<{ to: string; subject: string }>;
};

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, fout: "Niet ingelogd." }, { status: 401 });
  if (!isSuperAdminEmail(user.email ?? "")) {
    return NextResponse.json({ ok: false, fout: "Alleen voor super-admin." }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, voornaam, achternaam")
    .eq("id", user.id)
    .single();
  const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;
  if (!tenantId) return NextResponse.json({ ok: false, fout: "Geen tenant gevonden." }, { status: 400 });

  const admin = createAdminClient();
  const stappen: Stap[] = [];
  const g = globalThis as unknown as MailGlobals;
  g.__NOAH_MAIL_DRYRUN = true;
  g.__NOAH_MAIL_CAPTURED = [];

  let vacId = "";
  let kandId = "";

  async function checkFase(verwacht: string, naar: string, label: string) {
    await verplaatsKandidaat(kandId, vacId, naar);
    const { data: k } = await admin
      .from("kandidaten")
      .select("kanban_stap")
      .eq("id", kandId)
      .single();
    const ok = (k as { kanban_stap?: string } | null)?.kanban_stap === verwacht;
    stappen.push({
      naam: label,
      ok,
      detail: ok ? `Kandidaat staat nu correct in "${naar}".` : `Onverwachte fase: ${(k as { kanban_stap?: string } | null)?.kanban_stap ?? "?"}`,
    });
  }

  try {
    // 1) Testdata: vacature (W&S 15%) + kandidaat in Intake
    const { data: vac, error: ve } = await admin
      .from("rec_vacatures")
      .insert({
        eigenaar: user.id,
        setter_id: user.id,
        titel: `${MARK} Testfunctie`,
        locatie: "Teststad",
        status: "open",
        intern_bedrijf: `${MARK} Testbedrijf`,
        intern_contactpersoon: "Test Contactpersoon",
        intern_mailadres: "flowtest-opdrachtgever@noahtest.local",
        intern_telefoon: "0600000000",
        bedrijfsnaam: `${MARK} Testbedrijf`,
        contact_naam: "Test Contactpersoon",
        contact_email: "flowtest-opdrachtgever@noahtest.local",
        afspraak_tarief_type: "ws_15",
      })
      .select("id")
      .single();
    if (ve || !vac) throw new Error("Testvacature aanmaken mislukt: " + (ve?.message ?? "onbekend"));
    vacId = (vac as { id: string }).id;

    const { data: kand, error: ke } = await admin
      .from("kandidaten")
      .insert({
        tenant_id: tenantId,
        eigenaar_id: user.id,
        vacature_id: vacId,
        voornaam: MARK,
        achternaam: "Testkandidaat",
        email: "flowtest-kandidaat@noahtest.local",
        telefoon: "0611111111",
        woonplaats: "Teststad",
        kanban_stap: "interne_intake",
        status: "in_proces",
        intake_voltooid: true,
        bron_bellijst_item_id: crypto.randomUUID(),
        profielschets: "Ervaren testkandidaat met sterke vaardigheden voor de testfunctie.",
      })
      .select("id")
      .single();
    if (ke || !kand) throw new Error("Testkandidaat aanmaken mislukt: " + (ke?.message ?? "onbekend"));
    kandId = (kand as { id: string }).id;
    stappen.push({ naam: "Testvacature + testkandidaat aangemaakt", ok: true, detail: "Kandidaat staat in fase Intake onder de testvacature (W&S 15%)." });

    // 2) Door de pijplijn slepen
    await checkFase("kandidatenpool", "Pool", "Sleep naar Pool");

    const voorVoorstel = (g.__NOAH_MAIL_CAPTURED ?? []).length;
    await checkFase("in_proces", "Voorgesteld", "Sleep naar Voorgesteld");
    const voorstelMail = (g.__NOAH_MAIL_CAPTURED ?? []).length > voorVoorstel;
    stappen.push({
      naam: "Voorstel-mail naar opdrachtgever",
      ok: voorstelMail,
      detail: voorstelMail
        ? "Mail zou (dry-run) naar de opdrachtgever gaan met het anonieme voorstelprofiel."
        : "Er werd geen voorstel-mail klaargezet.",
    });

    await checkFase("in_proces", "Gezien", "Sleep naar Gezien");
    await checkFase("in_proces", "Op gesprek", "Sleep naar Op gesprek");

    // 3) Plaatsing (Geplaatst) — backoffice + contractcontrole-mail
    const voorPlaatsing = (g.__NOAH_MAIL_CAPTURED ?? []).length;
    await verplaatsKandidaat(kandId, vacId, "Geplaatst");
    const { data: kg } = await admin.from("kandidaten").select("kanban_stap").eq("id", kandId).single();
    const { data: pl } = await admin
      .from("plaatsingen")
      .select("id")
      .eq("kandidaat_id", kandId)
      .is("afgekeurd_op", null)
      .limit(1);
    const plaatsingOk = (kg as { kanban_stap?: string } | null)?.kanban_stap === "geplaatst" && ((pl ?? []).length > 0);
    stappen.push({
      naam: "Plaatsing afronden (Geplaatst)",
      ok: plaatsingOk,
      detail: plaatsingOk ? "Plaatsing opgeslagen en kandidaat staat op 'Geplaatst'." : "Plaatsing is niet correct vastgelegd.",
    });
    const plaatsingMails = (g.__NOAH_MAIL_CAPTURED ?? []).length > voorPlaatsing;
    stappen.push({
      naam: "Backoffice- + contractcontrole-mail bij plaatsing",
      ok: plaatsingMails,
      detail: plaatsingMails
        ? "Mails zouden (dry-run) naar de backoffice én de opdrachtgever (AVG-contractcontrole) gaan."
        : "Er werden geen plaatsings-mails klaargezet.",
    });
  } catch (e) {
    stappen.push({ naam: "Flow afgebroken", ok: false, detail: String((e as Error).message) });
  } finally {
    // Opruimen — altijd, ook bij fout halverwege.
    try {
      if (kandId) {
        const { data: plIds } = await admin.from("plaatsingen").select("id").eq("kandidaat_id", kandId);
        const ids = ((plIds ?? []) as Array<{ id: string }>).map((p) => p.id);
        if (ids.length) await admin.from("contract_verzoeken").delete().in("plaatsing_id", ids);
        await admin.from("plaatsingen").delete().eq("kandidaat_id", kandId);
        await admin.from("kandidaten").delete().eq("id", kandId);
      }
      if (vacId) await admin.from("rec_vacatures").delete().eq("id", vacId);
      stappen.push({ naam: "Testdata opgeruimd", ok: true, detail: "Testvacature, -kandidaat en -plaatsing zijn weer verwijderd." });
    } catch (e) {
      stappen.push({ naam: "Opruimen", ok: false, detail: "Opruimen deels mislukt: " + String((e as Error).message) });
    }
  }

  const mails = [...(g.__NOAH_MAIL_CAPTURED ?? [])];
  g.__NOAH_MAIL_DRYRUN = false;
  g.__NOAH_MAIL_CAPTURED = [];

  const allesGoed = stappen.every((s) => s.ok);
  return NextResponse.json({ ok: allesGoed, stappen, mails });
}
