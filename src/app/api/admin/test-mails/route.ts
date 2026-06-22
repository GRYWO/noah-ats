import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import {
  sendKandidaatBevestiging,
  sendKandidaatVoorgesteld,
  sendKandidaatAfwijzing,
  sendIntakeAfgerond,
  sendInProcesGestart,
  sendGesprek1Bevestiging,
  sendGesprek2Succes,
  sendKandidaatPlaatsing,
  sendVoorstelprofielNaarContact,
  sendPoolVoorstelNaarContact,
  sendReminderMail,
  sendContractControleUitnodiging,
  sendPlaatsingNaarBackoffice,
  sendHelpVraagNaarYorith,
  sendWelkomstmailUser,
  sendInloggegevensOpnieuw,
} from "@/utils/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ============================================================================
// Stuurt van elk belangrijk mailtype een voorbeeld met NEPDATA naar één adres.
// Gebruikt de force-to-override in email.ts, zodat ook mails die normaal naar de
// backoffice/Yorith gaan bij dit adres landen. Alleen voor super-admins.
// ============================================================================

const MORGEN = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, fout: "Niet ingelogd." }, { status: 401 });
  if (!isSuperAdminEmail(user.email ?? "")) {
    return NextResponse.json({ ok: false, fout: "Alleen voor super-admin." }, { status: 403 });
  }

  let naar = "yorithh93@gmail.com";
  try {
    const body = (await req.json()) as { naar?: string };
    if (body?.naar && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.naar)) naar = body.naar.trim();
  } catch {
    // geen body — standaardadres gebruiken
  }

  const v = "Test"; // kandidaat-voornaam
  const taken: Array<{ naam: string; fn: () => Promise<unknown> }> = [
    { naam: "Kandidaat — voorgesteld", fn: () => sendKandidaatVoorgesteld({ naar, kandidaatVoornaam: v }) },
    { naam: "Kandidaat — afwijzing", fn: () => sendKandidaatAfwijzing({ naar, kandidaatVoornaam: v }) },
    { naam: "Kandidaat — intake afgerond", fn: () => sendIntakeAfgerond({ naar, kandidaatVoornaam: v }) },
    { naam: "Kandidaat — in proces gestart", fn: () => sendInProcesGestart({ naar, kandidaatVoornaam: v }) },
    {
      naam: "Kandidaat — bevestiging kennismaking",
      fn: () =>
        sendKandidaatBevestiging({
          naar,
          kandidaatVoornaam: v,
          bedrijf: "Testbedrijf BV",
          contactpersoon: "Jan Jansen",
          contact_telefoon: "0612345678",
          contact_email: "contact@testbedrijf.nl",
          locatie_url: "https://maps.google.com/?q=Amsterdam",
          datum_1: MORGEN,
          datum_2: null,
          datum_3: null,
          opmerking: "Neem je ID-bewijs mee.",
          voorstelToken: "testtoken123",
        }),
    },
    {
      naam: "Kandidaat — bevestiging 1e gesprek",
      fn: () =>
        sendGesprek1Bevestiging({
          naar,
          kandidaatVoornaam: v,
          bedrijf: "Testbedrijf BV",
          kennismaking_op: MORGEN,
          contactpersoon: "Jan Jansen",
          contact_telefoon: "0612345678",
          locatie_url: "https://maps.google.com/?q=Amsterdam",
        }),
    },
    { naam: "Kandidaat — succes 2e gesprek", fn: () => sendGesprek2Succes({ naar, kandidaatVoornaam: v, bedrijf: "Testbedrijf BV" }) },
    { naam: "Kandidaat — geplaatst (gefeliciteerd)", fn: () => sendKandidaatPlaatsing({ naar, kandidaatVoornaam: v }) },
    {
      naam: "Opdrachtgever — voorstelprofiel",
      fn: () =>
        sendVoorstelprofielNaarContact({
          naar,
          contactpersoon: "Jan Jansen",
          functie: "Heftruckchauffeur",
          profielUrl: "https://noah-recruitment.nl/voorstelprofiel/testtoken123",
          setterNaam: "Noah Recruitment",
        }),
    },
    {
      naam: "Opdrachtgever — meerdere kandidaten (pool)",
      fn: () =>
        sendPoolVoorstelNaarContact({
          naar,
          contactpersoon: "Jan Jansen",
          functie: "Heftruckchauffeur",
          profielUrls: [
            "https://noah-recruitment.nl/voorstelprofiel/test1",
            "https://noah-recruitment.nl/voorstelprofiel/test2",
          ],
          setterNaam: "Noah Recruitment",
        }),
    },
    {
      naam: "Opdrachtgever — herinnering",
      fn: () =>
        sendReminderMail({
          naar,
          opdrachtgeverNaam: "Jan Jansen",
          kandidaatNaam: "Test Kandidaat",
          token: "testtoken123",
          reminderNr: 1,
          laatsteDag: false,
        }),
    },
    {
      naam: "Opdrachtgever — contractcontrole (AVG)",
      fn: () =>
        sendContractControleUitnodiging({
          naar,
          contactNaam: "Jan Jansen",
          kandidaatNaam: "Test Kandidaat",
          token: "testtoken123",
          feePercentage: 15,
        }),
    },
    {
      naam: "Backoffice — nieuwe plaatsing",
      fn: () =>
        sendPlaatsingNaarBackoffice({
          kandidaat: { voornaam: "Test", achternaam: "Kandidaat", email: "kandidaat@test.nl", telefoon: "0611111111", woonplaats: "Amsterdam" },
          klant: { bedrijf: "Testbedrijf BV", contactpersoon: "Jan Jansen", contact_email: "contact@testbedrijf.nl", contact_telefoon: "0612345678" },
          deal: { basis: "werving_selectie", tarief_pct: 15, betaling: "1x_7d", startdatum: MORGEN, opmerking: "Functie: Heftruckchauffeur" },
          aangemeldDoor: { voornaam: "Test", achternaam: "Setter", email: naar },
        }),
    },
    {
      naam: "Intern — hulpvraag naar Yorith",
      fn: () =>
        sendHelpVraagNaarYorith({
          type: "vraag",
          bericht: "Dit is een testvraag uit de mailtest.",
          afzender: { naam: "Test Setter", email: naar, rol: "setter" },
          tenantNaam: "Noah Recruitment",
          naar,
        }),
    },
    {
      naam: "Setter — welkomstmail",
      fn: () =>
        sendWelkomstmailUser({
          naar,
          voornaam: "Test",
          email: naar,
          wachtwoord: "Tijdelijk1234!",
          rolLabel: "Setter",
          bedrijf: "Noah Recruitment",
        }),
    },
    {
      naam: "Setter — nieuwe inloggegevens",
      fn: () =>
        sendInloggegevensOpnieuw({
          naar,
          voornaam: "Test",
          email: naar,
          wachtwoord: "Tijdelijk1234!",
          rolLabel: "Setter",
          bedrijf: "Noah Recruitment",
        }),
    },
  ];

  const g = globalThis as unknown as { __NOAH_MAIL_FORCE_TO?: string };
  g.__NOAH_MAIL_FORCE_TO = naar;

  const resultaten: Array<{ naam: string; ok: boolean; fout?: string }> = [];
  try {
    for (const t of taken) {
      try {
        await t.fn();
        resultaten.push({ naam: t.naam, ok: true });
      } catch (e) {
        resultaten.push({ naam: t.naam, ok: false, fout: String((e as Error).message) });
      }
    }
  } finally {
    g.__NOAH_MAIL_FORCE_TO = undefined;
  }

  const aantalOk = resultaten.filter((r) => r.ok).length;
  return NextResponse.json({ ok: aantalOk === resultaten.length, naar, aantalOk, totaal: resultaten.length, resultaten });
}
