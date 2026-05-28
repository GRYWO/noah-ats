"use server";

import { randomBytes } from "crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  sendContractControleUitnodiging,
  sendContractNaarBackoffice,
} from "@/utils/email";
import { redacteerContract } from "@/utils/contract-redactie";
import { revalidatePath } from "next/cache";

/**
 * Maakt een contract-verzoek aan + stuurt mail naar opdrachtgever.
 * Gebruikt vanuit de plaatsing-flow of als losse actie op de kandidaat-pagina.
 */
export async function vraagContractAan({
  plaatsingId,
  opdrachtgeverNaam,
  opdrachtgeverEmail,
  kandidaatNaam,
  opgegevenSalaris,
}: {
  plaatsingId: string;
  opdrachtgeverNaam: string;
  opdrachtgeverEmail: string;
  kandidaatNaam: string;
  opgegevenSalaris: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Niet ingelogd" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  const token = randomBytes(24).toString("hex");

  const { data: verzoek, error } = await admin
    .from("contract_verzoeken")
    .insert({
      plaatsing_id: plaatsingId,
      tenant_id: profile?.tenant_id ?? null,
      token,
      status: "verzonden",
      opdrachtgever_naam: opdrachtgeverNaam,
      opdrachtgever_email: opdrachtgeverEmail,
      kandidaat_naam: kandidaatNaam,
      opgegeven_salaris: opgegevenSalaris,
    })
    .select()
    .single();

  if (error || !verzoek) {
    return { ok: false, error: error?.message ?? "Aanmaken mislukt" };
  }

  try {
    await sendContractControleUitnodiging({
      naar: opdrachtgeverEmail,
      contactNaam: opdrachtgeverNaam,
      kandidaatNaam,
      token,
    });
  } catch (e) {
    console.error("[contract-controle] mail mislukt:", e);
    return { ok: false, error: "Mail mislukt — verzoek wel aangemaakt" };
  }

  revalidatePath("/kandidaten");
  return { ok: true, token };
}

/**
 * Klant upload contract. Wij doen redactie + sturen naar GRYWO.
 * Aangeroepen vanaf de publieke /contract-controle/[token] pagina.
 */
export async function verwerkContractUpload(formData: FormData) {
  const token = formData.get("token") as string;
  const bestand = formData.get("contract") as File | null;
  if (!token || !bestand) return { ok: false, error: "Geen bestand of token" };
  if (bestand.size === 0) return { ok: false, error: "Bestand is leeg" };
  if (bestand.size > 10 * 1024 * 1024) return { ok: false, error: "Max 10 MB" };
  if (bestand.type !== "application/pdf") return { ok: false, error: "Alleen PDF toegestaan" };

  const admin = createAdminClient();

  const { data: verzoek, error: lEr } = await admin
    .from("contract_verzoeken")
    .select("*")
    .eq("token", token)
    .single();
  if (lEr || !verzoek) return { ok: false, error: "Verzoek niet gevonden" };
  if (verzoek.status === "afgerond") {
    return { ok: false, error: "Dit verzoek is al afgerond." };
  }

  // 1) Origineel opslaan in privé bucket (max 24u)
  const ts = Date.now();
  const origPad = `${verzoek.id}/origineel-${ts}.pdf`;
  const bytes = new Uint8Array(await bestand.arrayBuffer());
  const upR = await admin.storage.from("contracten").upload(origPad, bytes, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upR.error) return { ok: false, error: "Upload mislukt: " + upR.error.message };

  // 2) AI-redactie
  let redactie;
  try {
    redactie = await redacteerContract(bytes);
  } catch (e) {
    console.error("[contract] redactie mislukt:", e);
    return { ok: false, error: "Verwerking mislukt — probeer opnieuw of mail backoffice@grywo.nl" };
  }

  // 3) Geredacteerde + samenvattings-PDF opslaan
  const geredPad = `${verzoek.id}/geredacteerd-${ts}.pdf`;
  const samPad = `${verzoek.id}/samenvatting-${ts}.pdf`;
  await admin.storage.from("contracten").upload(geredPad, redactie.geredacteerdePdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  await admin.storage.from("contracten").upload(samPad, redactie.samenvattingPdf, {
    contentType: "application/pdf",
    upsert: false,
  });

  // 4) Mail naar GRYWO backoffice met beide attachments
  try {
    await sendContractNaarBackoffice({
      kandidaatNaam: verzoek.kandidaat_naam,
      werkgever: redactie.werkgever,
      brutoJaarsalaris: redactie.brutoJaarsalaris,
      startdatum: redactie.startdatum,
      functie: redactie.functie,
      geredacteerdePdf: redactie.geredacteerdePdf,
      samenvattingPdf: redactie.samenvattingPdf,
    });
  } catch (e) {
    console.error("[contract] mail naar GRYWO mislukt:", e);
  }

  // 5) Update verzoek
  await admin
    .from("contract_verzoeken")
    .update({
      status: "afgerond",
      origineel_pad: origPad,
      geredacteerd_pad: geredPad,
      samenvatting_pad: samPad,
      contract_salaris: redactie.brutoJaarsalaris,
      contract_functie: redactie.functie,
      contract_startdatum: redactie.startdatum,
      contract_duur: redactie.contractduur,
      contract_werkgever: redactie.werkgever,
      redactie_log: redactie.redactieCounts as never,
      geupload_op: new Date().toISOString(),
      afgerond_op: new Date().toISOString(),
    })
    .eq("id", verzoek.id);

  return {
    ok: true,
    salaris: redactie.brutoJaarsalaris,
    functie: redactie.functie,
    startdatum: redactie.startdatum,
  };
}
