import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { uitnodigen } from "../actions";

export default async function UitnodigenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: voorstel } = await admin
    .from("voorstellen")
    .select("*, kandidaat:kandidaten(voornaam, achternaam)")
    .eq("token", token)
    .single();

  if (!voorstel) notFound();

  return (
    <main className="min-h-screen bg-[#f4f4f7] py-8 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#333399] rounded-t-2xl p-5 text-center">
          <div className="inline-flex items-baseline">
            <span className="text-white text-3xl font-black tracking-tighter">noah</span>
            <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block"></span>
          </div>
        </div>
        <div className="bg-white rounded-b-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-[#333399] mb-1">
            {voorstel.kandidaat.voornaam} uitnodigen
          </h1>
          <p className="text-gray-600 text-sm mb-6">
            Vul deze info in. {voorstel.kandidaat.voornaam} ontvangt direct alle details per mail.
          </p>

          <form action={uitnodigen} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bedrijfsnaam *</label>
                <input name="bedrijf" required placeholder="TechCorp NL" className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contactpersoon *</label>
                <input name="contactpersoon" required placeholder="Jan van der Berg" className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Telefoonnummer *</label>
                <input name="contact_telefoon" required placeholder="+31 20 1234567" className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">E-mailadres *</label>
                <input name="contact_email" type="email" required placeholder="jan@techcorp.nl" className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Locatie kennismaking * <span className="text-gray-400 font-normal">(Google Maps link)</span>
              </label>
              <input name="locatie_url" required placeholder="https://maps.google.com/?q=..." className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]" />
            </div>

            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-md">
              <label className="block text-sm font-semibold text-gray-700 mb-2">3 voorgestelde datums *</label>
              <div className="grid grid-cols-3 gap-3">
                <input name="datum_1" type="datetime-local" required className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" />
                <input name="datum_2" type="datetime-local" required className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" />
                <input name="datum_3" type="datetime-local" required className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Opmerking <span className="text-gray-400 font-normal">(optioneel)</span></label>
              <textarea name="opmerking" rows={3} placeholder="Dresscode, parkeren, contact bij ontvangst..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"></textarea>
            </div>

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-lg text-base transition">
              Verzenden — {voorstel.kandidaat.voornaam} krijgt direct alle info
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
