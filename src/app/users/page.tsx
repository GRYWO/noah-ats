import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { getViewerRol } from "@/utils/view-as";
import { TopBar } from "@/components/TopBar";
import { nieuweSetter } from "./actions";
import { UserRij } from "./UserRij";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_SETTERS } from "@/utils/pagina-tours";
import { AanvragenKnop } from "./AanvragenKnoppen";
import { SetterAbonnementMelding } from "./SetterAbonnementMelding";
import { BevestigingKnop } from "./BevestigingKnop";
import { isSalesAdmin } from "@/utils/sales-admin";

export default async function SettersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Demo-modus respecteren — in demo zien we als die rol
  const viewerRol = await getViewerRol();
  const isSuperAdmin = viewerRol.isSuperAdmin;
  // Sales-admin (Pepijn) krijgt dezelfde brede toegang als super-admin op /users
  // — hij beheert alle bureaus, dus moet alle users + alle rollen kunnen zien.
  const isSales = await isSalesAdmin(user);
  // Intern personeel (Wouter) ziet ook alle setters cross-tenant —
  // nieuwe setters komen in GRYWO-pool, niet in zijn eigen bureau-tenant.
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("is_intern_personeel")
    .eq("id", user!.id)
    .maybeSingle();
  const isInternPersoneel = !!viewerProfile?.is_intern_personeel;
  const breedheidstoegang = isSuperAdmin || isSales || isInternPersoneel;

  // Super- of sales-admin gebruikt admin-client zodat RLS niets uitfiltert.
  const settersClient = breedheidstoegang ? createAdminClient() : supabase;
  let settersQuery = settersClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  // Bureau-admins zien ALLEEN eigen tenant. Super-/sales-admin zien alles.
  if (!breedheidstoegang) {
    const { data: eigenProfile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user!.id)
      .single();
    if (eigenProfile?.tenant_id) {
      settersQuery = settersQuery.eq("tenant_id", eigenProfile.tenant_id);
    }
  }

  const { data: settersRuw } = await settersQuery;

  // Filter voor bureau-admin: alleen recruiters tonen
  // (setters worden centraal door GRYWO geregeld).
  // Super-/sales-admin zien iedereen.
  const setters = breedheidstoegang
    ? settersRuw
    : (settersRuw ?? []).filter(
        (s) => s.rol === "recruiter" && !isSuperAdminEmail(s.email),
      );

  const isAdmin = viewerRol.isAdmin || isSuperAdmin;
  // Bureau-admin (geen super-admin/sales-admin) mag alleen recruiters aanmaken.
  // Super-admin (Yorith) en sales-admin (Pepijn) mogen alle rollen kiezen.
  const magAlleRollen = isSuperAdmin || isSales;

  // Email-map gebruikt nu de denormalized profiles.email kolom (gesynced via trigger).
  // Voorheen riepen we auth.admin.listUsers({perPage:200}) per request — traag.
  const adminCli = createAdminClient();
  const emailById = new Map<string, string>();
  for (const s of setters ?? []) {
    if (s.email) emailById.set(s.id, s.email);
  }

  // Laatste akkoord-status per user — voor de "Akkoord"-kolom
  const akkoordById = new Map<string, { id: string; status: string; token: string; type: string; verzonden_op: string; getekend_op: string | null }>();
  try {
    const { data: rows } = await adminCli
      .from("user_agreements")
      .select("id, user_id, status, token, type, verzonden_op, getekend_op")
      .order("verzonden_op", { ascending: false });
    for (const r of rows ?? []) {
      if (!akkoordById.has(r.user_id)) akkoordById.set(r.user_id, r);
    }
  } catch (e) {
    console.error("[setters] akkoord-status laden mislukt:", e);
  }

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="setters" />
      <PaginaTour pad="/users" naam="Setters" stappen={TOUR_SETTERS} />

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Users</h1>
          <p className="text-gray-500 text-sm mt-1">
            {setters?.length ?? 0} {isSuperAdmin ? "users" : "recruiters"} in dit bureau
          </p>
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
                <input name="email" type="email" required placeholder="voorbeeld@grywo.nl" autoComplete="off" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <AanvragenKnop type="email" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                <input name="telefoon" placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Voys-nummer</label>
                <input name="voys_nummer" placeholder="+31 85 ... (vanuit Voys-portal)" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <AanvragenKnop type="voys" />
                <BevestigingKnop />
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

              {/* Dynamisch: alleen tonen als rol=setter geselecteerd is.
                  Recruiter-melding (bureau-abonnement schaalt mee) hoort niet
                  bij users — die staat bij /bureaus omdat het bureau-finance is. */}
              <SetterAbonnementMelding />

              <div className="col-span-2 pt-3 mt-2 border-t">
                <h4 className="text-xs uppercase text-gray-500 font-semibold mb-2">Mailbox (Hostnet)</h4>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Verzend-mailbox (Hostnet, @grywo.nl)</label>
                <input name="mail_adres" type="email" placeholder="voornaam.achternaam@grywo.nl" autoComplete="off" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Hier vandaan worden voorstellen verzonden. Leeg = auto voornaam@grywo.nl</small>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mail-wachtwoord (Hostnet)</label>
                <input name="mail_wachtwoord" type="password" placeholder="Voor IMAP/SMTP" autoComplete="new-password" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
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
                  <th className="text-left px-4 py-3 font-semibold">Coach</th>
                  <th className="text-left px-4 py-3 font-semibold">Akkoord</th>
                  <th className="text-left px-4 py-3 font-semibold">Aangemaakt</th>
                  {isAdmin && <th className="text-right px-4 py-3 font-semibold">Acties</th>}
                </tr>
              </thead>
              <tbody>
                {setters.map((s) => {
                  const setterEmail = emailById.get(s.id) ?? null;
                  const akkoord = akkoordById.get(s.id) ?? null;
                  return (
                    <UserRij
                      key={s.id}
                      setter={s}
                      isHuidigeUser={s.id === user?.id}
                      isAdmin={isAdmin}
                      magAlleRollen={magAlleRollen}
                      isSuperAdmin={isSuperAdminEmail(setterEmail)}
                      viewerIsSuperAdmin={isSuperAdmin}
                      akkoord={akkoord}
                    />
                  );
                })}
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
