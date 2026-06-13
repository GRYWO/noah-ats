import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendGesprek1Bevestiging, sendGesprek1BevestigingOpdrachtgever } from "@/utils/email";
import { getSetterFrom } from "@/utils/email-helpers";
import { maakNotificatie } from "@/utils/notificaties";
import { logVoorstelEvent } from "@/utils/voorstel-log";

export const dynamic = "force-dynamic";

export default async function KiesDatumPage({
  params,
}: {
  params: Promise<{ token: string; index: string }>;
}) {
  const { token, index } = await params;
  const idx = parseInt(index);
  if (![1, 2, 3].includes(idx)) {
    return <FoutPagina melding="Ongeldige keuze. Klik in de mail op een van de 3 knoppen." />;
  }

  const admin = createAdminClient();
  const { data: voorstel } = await admin
    .from("voorstellen")
    .select("id, tenant_id, kandidaat_id, setter_id, status, bedrijf, contactpersoon, contact_telefoon, contact_email, locatie_url, datum_1, datum_2, datum_3, kennismaking_op, kandidaat:kandidaten(voornaam, email)")
    .eq("token", token)
    .single();

  if (!voorstel) {
    return <FoutPagina melding="Voorstel niet gevonden — de link is mogelijk verlopen." />;
  }

  const gekozenDatum =
    idx === 1 ? voorstel.datum_1 :
    idx === 2 ? voorstel.datum_2 :
                voorstel.datum_3;

  if (!gekozenDatum) {
    return <FoutPagina melding="Deze datum is niet beschikbaar." />;
  }

  // Bestaande keuze? Toon dezelfde bedankt-pagina maar zonder dubbele mail
  const alGekozen = voorstel.kennismaking_op && new Date(voorstel.kennismaking_op).getTime() === new Date(gekozenDatum).getTime();

  if (!alGekozen) {
    // Update voorstel met gekozen datum
    await admin.from("voorstellen").update({
      kennismaking_op: gekozenDatum,
      kandidaat_datum_gekozen_op: new Date().toISOString(),
    }).eq("id", voorstel.id);

    // Markeer kandidaat zodat kanban-trigger geen dubbele bevestiging stuurt
    if (voorstel.kandidaat_id) {
      await admin.from("kandidaten")
        .update({ gesprek1_mail_sent: new Date().toISOString() })
        .eq("id", voorstel.kandidaat_id);
    }

    // Kandidaat krijgt bevestiging
    const kand = Array.isArray(voorstel.kandidaat) ? voorstel.kandidaat[0] : voorstel.kandidaat;
    const setterFrom = voorstel.setter_id ? await getSetterFrom(voorstel.setter_id) : undefined;
    if (kand?.email) {
      try {
        await sendGesprek1Bevestiging({
          naar: kand.email,
          kandidaatVoornaam: kand.voornaam ?? "",
          bedrijf: voorstel.bedrijf ?? null,
          kennismaking_op: gekozenDatum,
          contactpersoon: voorstel.contactpersoon,
          contact_telefoon: voorstel.contact_telefoon,
          locatie_url: voorstel.locatie_url,
          from: setterFrom,
        });
      } catch (e) {
        console.error("[kies-datum] kandidaat-bevestiging mislukt:", e);
      }
    }

    // Opdrachtgever krijgt óók een bevestiging — met datum + kandidaat-naam
    if (voorstel.contact_email) {
      try {
        await sendGesprek1BevestigingOpdrachtgever({
          naar: voorstel.contact_email,
          opdrachtgeverNaam: voorstel.contactpersoon ?? null,
          kandidaatVoornaam: kand?.voornaam ?? "de kandidaat",
          bedrijf: voorstel.bedrijf ?? null,
          kennismaking_op: gekozenDatum,
          contactpersoon: voorstel.contactpersoon,
          locatie_url: voorstel.locatie_url,
          from: setterFrom,
        });
      } catch (e) {
        console.error("[kies-datum] opdrachtgever-bevestiging mislukt:", e);
      }
    }

    // Notificatie naar setter + team
    if (voorstel.tenant_id) {
      const datumLabel = new Date(gekozenDatum).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
      try {
        if (voorstel.setter_id) {
          await maakNotificatie({
            tenantId: voorstel.tenant_id,
            userId: voorstel.setter_id,
            type: "kennismaking_gepland",
            titel: `${kand?.voornaam ?? "Kandidaat"} koos optie ${idx}`,
            bericht: `Kennismaking ${voorstel.bedrijf ? `bij ${voorstel.bedrijf} ` : ""}op ${datumLabel}.`,
            linkUrl: `/kandidaten/${voorstel.kandidaat_id}`,
          });
        }
        await logVoorstelEvent({
          tenantId: voorstel.tenant_id,
          voorstelId: voorstel.id,
          kandidaatId: voorstel.kandidaat_id ?? undefined,
          event: "kennismaking_gepland",
          beschrijving: `Kandidaat koos optie ${idx} — kennismaking ${datumLabel}`,
          zichtbaarVoorKandidaat: true,
        });
      } catch (e) {
        console.error("[kies-datum] notificatie mislukt:", e);
      }
    }
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0f0f23] text-white flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[#333399] via-[#1f1f5c] to-[#0f0f23]"
      />
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>Powered by</span>
          <Image src="/grywo-logo-wit.png" alt="Noah recruitment" width={70} height={20} className="opacity-90" />
        </div>
      </header>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h1 className="text-3xl font-bold mb-2">Je keuze is doorgegeven!</h1>
        <p className="text-white/70 mb-6 text-base">
          Kennismaking gepland op{" "}
          <b className="text-white">
            {new Date(gekozenDatum).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}
          </b>
          {voorstel.bedrijf && <> bij <b className="text-white">{voorstel.bedrijf}</b></>}.
        </p>

        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 text-left text-sm space-y-2">
          {voorstel.contactpersoon && (
            <div><span className="text-white/50">Contactpersoon:</span> <b>{voorstel.contactpersoon}</b></div>
          )}
          {voorstel.contact_telefoon && (
            <div><span className="text-white/50">Telefoon:</span> <b>{voorstel.contact_telefoon}</b></div>
          )}
          {voorstel.locatie_url && (
            <div>
              <span className="text-white/50">Locatie:</span>{" "}
              <a href={voorstel.locatie_url} className="text-[#ffd84d] underline">Bekijk op Google Maps</a>
            </div>
          )}
        </div>

        <p className="text-xs text-white/50 mt-6">
          We hebben je een bevestigingsmail gestuurd met alle details. Veel succes!
        </p>
      </section>

      <footer className="relative z-10 px-8 py-6 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} OneTwoStart NL B.V. — KvK 96738782
      </footer>
    </main>
  );
}

function FoutPagina({ melding }: { melding: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f0f23] text-white p-6">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">Hmm…</h1>
        <p className="text-white/70 text-sm">{melding}</p>
        <p className="text-white/50 text-xs mt-4">
          Vragen? Mail{" "}
          <a href="mailto:info@noah-recruitment.nl" className="underline">info@noah-recruitment.nl</a>
        </p>
      </div>
    </main>
  );
}
