import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { updateMailConfig } from "./actions";

export default async function InstellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <main className="min-h-screen bg-[#f4f4f7]">
      <TopBar active="instellingen" />

      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Mijn instellingen</h1>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            Opgeslagen.
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        <form action={updateMailConfig} className="space-y-6">
          {/* Persoonlijk */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Persoonlijk</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
                <input name="voornaam" required defaultValue={profile?.voornaam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
                <input name="achternaam" required defaultValue={profile?.achternaam ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                <input name="telefoon" defaultValue={profile?.telefoon ?? ""} placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Functietitel (in handtekening)</label>
                <input name="functie_titel" defaultValue={profile?.functie_titel ?? ""} placeholder="bv Eigenaar GRYWO, Senior recruiter, Sales Manager..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Laat leeg = standaard &quot;{profile?.rol === "admin" ? "Admin" : profile?.rol === "recruiter" ? "Recruiter" : "Setter"} bij GRYWO&quot;</small>
              </div>
            </div>
          </div>

          {/* Mailbox */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Mailbox (Hostnet)</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mail-adres *</label>
                <input name="mail_adres" type="email" required defaultValue={profile?.mail_adres ?? user?.email ?? ""} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mail-wachtwoord</label>
                <input name="mail_wachtwoord" type="password" placeholder={profile?.mail_wachtwoord ? "•••••••• (wijzig om te overschrijven)" : "Hostnet wachtwoord"} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Versleuteld in database opgeslagen. Laat leeg om huidig wachtwoord te behouden.</small>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Status:</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  profile?.mail_status === "actief" ? "bg-emerald-100 text-emerald-800" :
                  profile?.mail_status === "fout" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {profile?.mail_status === "actief" ? "Actief" :
                   profile?.mail_status === "fout" ? "Fout" :
                   "Niet geconfigureerd"}
                </span>
              </div>
            </div>
          </div>

          {/* Handtekening — auto gegenereerd, alleen preview */}
          {profile?.handtekening_html && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Handtekening preview</h2>
              <p className="text-xs text-gray-500 mb-3">Komt automatisch onder elke mail. Wordt geüpdatet als je naam/telefoon wijzigt.</p>
              <div
                className="border rounded-md p-4 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: profile.handtekening_html }}
              />
            </div>
          )}

          <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-8 py-2 rounded-md text-sm">
            Opslaan
          </button>
        </form>
      </div>
    </main>
  );
}
