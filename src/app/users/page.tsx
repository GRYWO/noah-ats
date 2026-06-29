import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";
import { getViewerRol } from "@/utils/view-as";
import { TopBar } from "@/components/TopBar";
import { UserRij } from "./UserRij";
import { ZetWachtwoordVeld } from "./ZetWachtwoordVeld";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_SETTERS } from "@/utils/pagina-tours";
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
  // Intern personeel (Wouter) ziet ook alle setters cross-tenant,
  // nieuwe setters komen in de Noah recruitment-pool, niet in zijn eigen bureau-tenant.
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
  // (setters worden centraal door Noah recruitment geregeld).
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

        {isSuperAdmin && <ZetWachtwoordVeld />}

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
