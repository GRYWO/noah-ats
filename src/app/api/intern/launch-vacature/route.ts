import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendNieuweVacatureOpNaam } from "@/utils/email";
import { maakNotificatie } from "@/utils/notificaties";

// Interne endpoint die Noah Launch aanroept zodra een vacature is geplaatst en
// die direct op naam van een eigenaar-setter staat (automatisch toegewezen).
// Dan — en alleen dan — worden de kandidaten automatisch gezocht en krijgt de
// setter een mail + melding. Onbeheerde vacatures doen hier niets; die starten
// hun zoekactie pas wanneer een setter ze claimt.
//
// Beveiliging: de gedeelde Supabase service-role-key (zelfde waarde in beide
// systemen omdat ze dezelfde database delen). Geen extra secret nodig.

function geautoriseerd(req: Request): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  const verwacht = `Bearer ${key}`;
  const header = req.headers.get("authorization") || "";
  if (header.length !== verwacht.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(verwacht));
  } catch {
    return false;
  }
}

// Werk-mailadres van de setter (zoals ook elders in de ATS bepaald).
function setterMailadres(voornaam: string | null, mailAdres: string | null): string | null {
  if (mailAdres && mailAdres.toLowerCase().endsWith("@noah-recruitment.nl")) return mailAdres;
  const lokaal = (voornaam ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
  if (!lokaal) return mailAdres || null;
  return `${lokaal}@noah-recruitment.nl`;
}

export async function POST(req: Request) {
  if (!geautoriseerd(req)) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  let vacatureId = "";
  try {
    const body = await req.json();
    vacatureId = String(body?.vacatureId || "").trim();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  if (!vacatureId) return NextResponse.json({ error: "vacatureId ontbreekt" }, { status: 400 });

  const admin = createAdminClient();
  const { data: vac } = await admin
    .from("rec_vacatures")
    .select("id, setter_id, bedrijfsnaam, titel, locatie, lat, lon, status")
    .eq("id", vacatureId)
    .maybeSingle();

  // Alleen iets doen als de vacature open is én al op naam van een setter staat.
  if (!vac || vac.status !== "open" || !vac.setter_id) {
    return NextResponse.json({ ok: true, actie: "geen" });
  }
  const setterId = vac.setter_id as string;

  // Zoekactie niet dubbel inzetten als er al een job voor deze vacature loopt.
  const { data: bestaand } = await admin
    .from("zoek_jobs")
    .select("id")
    .eq("vacature_id", vacatureId)
    .limit(1);

  const { data: setter } = await admin
    .from("profiles")
    .select("tenant_id, voornaam, achternaam, mail_adres")
    .eq("id", setterId)
    .maybeSingle();

  // 1) Kandidaten automatisch zoeken (Robin, 40 km) — net als bij claimen.
  if (!bestaand || bestaand.length === 0) {
    await admin.from("zoek_jobs").insert({
      tenant_id: setter?.tenant_id ?? null,
      type: "robin",
      zoekterm: (vac.titel as string | null) ?? "",
      vacature_id: vacatureId,
      straal_km: 40,
      plaats: (vac.locatie as string | null) ?? null,
      lat: (vac.lat as number | null) ?? null,
      lon: (vac.lon as number | null) ?? null,
      aangemaakt_door: setterId,
    });
  }

  // 2) Setter informeren: mail + in-app melding.
  const klant = (vac.bedrijfsnaam as string | null)?.trim() || "een opdrachtgever";
  const titel = (vac.titel as string | null)?.trim() || "Nieuwe vacature";
  const voornaam = (setter?.voornaam as string | null) ?? "";
  const naar = setterMailadres(voornaam, (setter?.mail_adres as string | null) ?? null);

  if (naar) {
    try {
      await sendNieuweVacatureOpNaam({ naar, voornaam: voornaam || "collega", klant, vacatureTitel: titel });
    } catch (e) {
      console.error("[launch-vacature] mail mislukt:", e);
    }
  }
  if (setter?.tenant_id) {
    try {
      await maakNotificatie({
        tenantId: setter.tenant_id as string,
        userId: setterId,
        type: "info",
        titel: "Nieuwe vacature op je naam",
        bericht: `${titel} — geplaatst door ${klant}. Kandidaten worden automatisch gezocht.`,
        linkUrl: "/vacature-aanmaken",
      });
    } catch (e) {
      console.error("[launch-vacature] notificatie mislukt:", e);
    }
  }

  return NextResponse.json({ ok: true, actie: "toegewezen" });
}
