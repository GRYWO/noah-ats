"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import * as mail from "@/utils/email";

const NAAR = "yorith@grywo.nl";

type Result = { ok?: boolean; error?: string };

// Dummy data voor de mail-templates
const dummyKandidaat = {
  voornaam: "Pieter",
  achternaam: "de Vries",
  leeftijd: 32,
  woonplaats: "Utrecht",
  opleiding: "HBO Bedrijfskunde",
  open_voor: "Sales Manager, Account Executive",
  rijbewijs: "B",
  eigen_vervoer: true,
  talen: "NL (moedertaal), EN (vloeiend)",
  vaardigheden: "Salesforce, B2B sales, account management",
  tarief_ws: "15% bruto jaarsalaris",
  score: 78,
};

const overMorgen = new Date(Date.now() + 2 * 86400000).toISOString();

async function vereisSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/dashboard");
  return user;
}

export async function verstuurTestMail(type: string): Promise<Result> {
  await vereisSuperAdmin();

  try {
    switch (type) {
      case "voorstel":
        await mail.sendVoorstelMail({
          naar: NAAR,
          opdrachtgeverNaam: "Acme B.V.",
          kandidaat: dummyKandidaat,
          bericht: "Een sterke kandidaat met 8 jaar B2B-ervaring.",
          token: "test-token-12345",
        });
        break;

      case "reminder":
        await mail.sendReminderMail({
          naar: NAAR,
          opdrachtgeverNaam: "Acme B.V.",
          kandidaatNaam: "Pieter",
          token: "test-token-12345",
          reminderNr: 1,
          laatsteDag: false,
        });
        break;

      case "bevestiging":
        await mail.sendKandidaatBevestiging({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
          bedrijf: "Acme B.V.",
          contactpersoon: "Jan Jansen",
          contact_telefoon: "+31 6 12345678",
          contact_email: "jan@acme.nl",
          locatie_url: "Hoofdstraat 12, Utrecht",
          datum_1: overMorgen,
          datum_2: new Date(Date.now() + 3 * 86400000).toISOString(),
          datum_3: new Date(Date.now() + 4 * 86400000).toISOString(),
          opmerking: "Graag op tijd aanwezig.",
        });
        break;

      case "kandidaat_voorgesteld":
        await mail.sendKandidaatVoorgesteld({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
        });
        break;

      case "kandidaat_afwijzing":
        await mail.sendKandidaatAfwijzing({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
        });
        break;

      case "kennismaking_reminder":
        await mail.sendKennismakingReminder({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
          bedrijf: "Acme B.V.",
          contactpersoon: "Jan Jansen",
          contact_telefoon: "+31 6 12345678",
          locatie_url: "Hoofdstraat 12, Utrecht",
          kennismaking_op: new Date(Date.now() + 86400000).toISOString(),
        });
        break;

      case "plaatsing_backoffice":
        await mail.sendPlaatsingNaarBackoffice({
          kandidaat: {
            voornaam: "Pieter",
            achternaam: "de Vries",
            email: "pieter@example.com",
            telefoon: "+31 6 87654321",
            woonplaats: "Utrecht",
            geboortedatum: "1992-06-15",
          },
          klant: {
            bedrijf: "Acme B.V.",
            contactpersoon: "Jan Jansen",
            contact_email: "jan@acme.nl",
            contact_telefoon: "+31 6 12345678",
          },
          deal: {
            basis: "werving_selectie",
            tarief_bedrag: 12500,
            betaling: "1x_7d",
            startdatum: new Date().toISOString().slice(0, 10),
          },
          aangemeldDoor: { voornaam: "Yorith", achternaam: "Hulzebosch", email: NAAR },
        });
        break;

      case "inloggegevens_opnieuw":
        await mail.sendInloggegevensOpnieuw({
          naar: NAAR,
          voornaam: "Pieter",
          email: NAAR,
          wachtwoord: "TijdelijkWachtwoord123",
          rolLabel: "Recruiter",
          bedrijf: "Acme Recruitment",
        });
        break;

      case "cv_reminder":
        await mail.sendCvReminderAanWachtende({
          naar: NAAR,
          voornaam: "Pieter",
        });
        break;

      case "plaatsing_afgekeurd":
        await mail.sendPlaatsingAfgekeurdNaarBackoffice({
          kandidaatNaam: "Pieter de Vries",
          bedrijf: "Acme B.V.",
          reden: "Kandidaat afgemeld voor 1ste werkdag",
          afgekeurdDoor: { voornaam: "Yorith", achternaam: "Hulzebosch", email: NAAR },
          oorspronkelijkeAanmelder: { voornaam: "Bart", achternaam: "Setter" },
        });
        break;

      case "help_yorith":
        await mail.sendHelpVraagNaarYorith({
          type: "vraag",
          bericht: "Hoe kan ik een setter toevoegen aan mijn bureau?",
          afzender: { naam: "Jan Jansen", email: "jan@acme.nl", rol: "Admin" },
          tenantNaam: "Acme Recruitment",
          naar: NAAR,
        });
        break;

      case "intake_afgerond":
        await mail.sendIntakeAfgerond({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
        });
        break;

      case "in_proces_gestart":
        await mail.sendInProcesGestart({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
        });
        break;

      case "gesprek1_bevestiging":
        await mail.sendGesprek1Bevestiging({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
          bedrijf: "Acme B.V.",
          kennismaking_op: new Date(Date.now() + 86400000).toISOString(),
          contactpersoon: "Jan Jansen",
          contact_telefoon: "+31 6 12345678",
          locatie_url: "Hoofdstraat 12, Utrecht",
        });
        break;

      case "gesprek2_succes":
        await mail.sendGesprek2Succes({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
          bedrijf: "Acme B.V.",
        });
        break;

      case "kandidaat_plaatsing":
        await mail.sendKandidaatPlaatsing({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
        });
        break;

      case "welkom_user":
        await mail.sendWelkomstmailUser({
          naar: NAAR,
          voornaam: "Pieter",
          email: NAAR,
          wachtwoord: "Welkom123!",
          rolLabel: "Recruiter",
          bedrijf: "Acme Recruitment",
        });
        break;

      case "welkom_bureau":
        await mail.sendWelkomstmailBureau({
          naar: NAAR,
          voornaam: "Jan",
          email: NAAR,
          wachtwoord: "Welkom123!",
          bedrijf: "Acme Recruitment",
        });
        break;

      case "kandidaat_status_afwijzing":
        await mail.sendKandidaatStatusAfwijzing({
          naar: NAAR,
          kandidaatVoornaam: "Pieter",
        });
        break;

      default:
        return { error: `Onbekend type: ${type}` };
    }

    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Onbekende fout" };
  }
}
