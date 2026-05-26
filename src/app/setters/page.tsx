import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { nieuweSetter, verwijderSetter } from "./actions";
import { DeleteSetterButton } from "./DeleteSetterButton";
import { InlineVoysEdit } from "./InlineVoysEdit";
import { CoachToggle } from "./CoachToggle";
import { ResetWachtwoordKnop } from "./ResetWachtwoordKnop";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_SETTERS } from "@/utils/pagina-tours";

const ROL_LABELS: Record<string, string> = {
  admin: "Admin",
  recruiter: "Recruiter",
  setter: "Setter",
};

const ROL_KLEUREN: Record<string, string> = {
  admin: "bg-purple-100 text-purple-800",
  recruiter: "bg-amber-100 text-amber-800",
  setter: "bg-blue-100 text-blue-800",
};

export default async function SettersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: setters } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user!.id)
    .single();

  const isAdmin = myProfile?.rol === "admin";
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  // Bureau-admin (geen super-admin) mag alleen recruiters aanmaken
  const magAlleRollen = isSuperAdmin;

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="setters" />
      <PaginaTour pad="/setters" naam="Setters" stappen={TOUR_SETTERS} />

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Setters & users</h1>
          <p className="text-gray-500 text-sm mt-1">{setters?.length ?? 0} users in dit bureau</p>
        </div>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {ok === "verwijderd" ? "User verwijderd" : "User aangemaakt"}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Nieuwe user form — alleen admins */}
        {isAdmin && (
          <details className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
            <summary className="cursor-pointer p-4 bg-[#333399] text-white font-semibold">
              Nieuwe user toevoegen
            </summary>
            <form action={nieuweSetter} className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
                <input name="voornaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
                <input name="achternaam" required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail *</label>
                <input name="email" type="email" required placeholder="bart@grywo.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Wachtwoord * (min 8 tekens)</label>
                <input name="wachtwoord" type="text" required minLength={8} placeholder="setter123..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                <input name="telefoon" placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Voys-nummer</label>
                <input name="voys_nummer" placeholder="+31 85 ... (vanuit Voys-portal)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Wordt gebruikt voor click-to-call. Bestel een nummer in Voys en plak hier.</small>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rol *</label>
                {magAlleRollen ? (
                  <select name="rol" defaultValue="setter" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    <option value="setter">Setter</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <>
                    <input type="hidden" name="rol" value="recruiter" />
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-700">
                      Recruiter
                    </div>
                    <small className="text-gray-400 text-xs">Setters/admins worden door Noah toegevoegd. Hulp nodig? Bel 085-4016082.</small>
                  </>
                )}
              </div>
              <div className="col-span-2 pt-3 mt-2 border-t">
                <h4 className="text-xs uppercase text-gray-500 font-semibold mb-2">Mailbox (Hostnet)</h4>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mail-adres bedrijf</label>
                <input name="mail_adres" type="email" placeholder="bart@grywo.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Laat leeg = zelfde als login-mail</small>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mail-wachtwoord (Hostnet)</label>
                <input name="mail_wachtwoord" type="password" placeholder="Voor IMAP/SMTP" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Versleuteld opgeslagen</small>
              </div>
              <div className="col-span-2 flex justify-end">
                <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
                  User aanmaken
                </button>
              </div>
            </form>
          </details>
        )}

        {/* Lijst */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {setters && setters.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Naam</th>
                  <th className="text-left px-4 py-3 font-semibold">Rol</th>
                  <th className="text-left px-4 py-3 font-semibold">Telefoon</th>
                  <th className="text-left px-4 py-3 font-semibold">Voys</th>
                  <th className="text-left px-4 py-3 font-semibold">Discord</th>
                  <th className="text-left px-4 py-3 font-semibold">Coach</th>
                  <th className="text-left px-4 py-3 font-semibold">Aangemaakt</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-semibold">Acties</th>}
                </tr>
              </thead>
              <tbody>
                {setters.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {s.voornaam} {s.achternaam}
                      {s.id === user?.id && <span className="ml-2 text-xs text-gray-400">(jij)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROL_KLEUREN[s.rol] ?? "bg-gray-100 text-gray-700"}`}>
                        {ROL_LABELS[s.rol] ?? s.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.telefoon ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <InlineVoysEdit setterId={s.id} huidig={s.voys_nummer ?? null} kanBewerken={isAdmin} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.discord_id ?? "—"}</td>
                    <td className="px-4 py-3">
                      <CoachToggle userId={s.id} isCoach={!!s.is_coach} disabled={!isAdmin} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString("nl-NL") : "—"}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {s.id !== user?.id && <ResetWachtwoordKnop userId={s.id} naam={`${s.voornaam} ${s.achternaam}`} />}
                          {s.id !== user?.id && <DeleteSetterButton id={s.id} naam={`${s.voornaam} ${s.achternaam}`} />}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <p className="text-sm">Nog geen users.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
