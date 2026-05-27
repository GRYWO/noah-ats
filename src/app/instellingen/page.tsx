import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { TopBar } from "@/components/TopBar";
import { isSuperAdminEmail } from "@/utils/auth";
import { updateMailConfig, wijzigEigenWachtwoord } from "./actions";
import { nieuwMailAccount, verwijderMailAccount, maakPrimair } from "./mail-actions";
import { updateMailTemplate, resetMailTemplate } from "./template-actions";
import { TEMPLATE_META, DEFAULT_BODIES, type TemplateSleutel } from "@/utils/mail-templates";
import { TourHerstartKnop } from "./TourHerstartKnop";

export default async function InstellingenPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileRes, accountsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase
      .from("mail_accounts")
      .select("id, mail_adres, display_naam, is_primary, mail_status, created_at")
      .eq("user_id", user!.id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  const profile = profileRes.data;
  const accounts = accountsRes.data ?? [];

  const isSuperAdmin = isSuperAdminEmail(user?.email);
  let templates: Record<string, string> = {};
  if (isSuperAdmin) {
    const admin = createAdminClient();
    const { data } = await admin.from("mail_templates").select("sleutel, body_html");
    templates = Object.fromEntries((data ?? []).map(t => [t.sleutel, t.body_html]));
  }

  const okMessages: Record<string, string> = {
    profiel: "Profiel opgeslagen.",
    account: "Mailbox toegevoegd.",
    verwijderd: "Mailbox verwijderd.",
    primair: "Primaire mailbox gewijzigd.",
    template: "Template opgeslagen.",
    template_reset: "Template teruggezet naar standaard.",
    wachtwoord: "Wachtwoord gewijzigd.",
  };

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="instellingen" />

      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Mijn instellingen</h1>

        {ok && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">
            {okMessages[ok] ?? "Opgeslagen."}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Persoonlijk + handtekening */}
        <form action={updateMailConfig} className="space-y-6 mb-8">
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
              {profile?.rol === "admin" && (
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Functietitel (in handtekening)</label>
                  <input name="functie_titel" defaultValue={profile?.functie_titel ?? ""} placeholder="bv Eigenaar GRYWO" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  <small className="text-gray-400 text-xs">Laat leeg = standaard &quot;Admin bij GRYWO&quot;. Alleen admins tonen een functie-regel.</small>
                </div>
              )}
            </div>
          </div>

          {profile?.handtekening_html && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-800 mb-4 pb-2 border-b">Handtekening preview</h2>
              <p className="text-xs text-gray-500 mb-3">Komt automatisch onder elke mail.</p>
              <div className="border rounded-md p-4 bg-gray-50" dangerouslySetInnerHTML={{ __html: profile.handtekening_html }} />
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3">
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-8 py-2 rounded-md text-sm">
              Profiel opslaan
            </button>
            <TourHerstartKnop />
          </div>
        </form>

        {/* Wachtwoord wijzigen */}
        <form action={wijzigEigenWachtwoord} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
          <h2 className="font-bold text-gray-800 pb-2 border-b">Wachtwoord wijzigen</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Huidig wachtwoord *</label>
              <input name="huidig_wachtwoord" type="password" required autoComplete="current-password" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nieuw wachtwoord * (min 8 tekens)</label>
              <input name="nieuw_wachtwoord" type="password" required minLength={8} autoComplete="new-password" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nieuw wachtwoord (herhalen) *</label>
              <input name="nieuw_wachtwoord2" type="password" required minLength={8} autoComplete="new-password" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
              Wachtwoord wijzigen
            </button>
          </div>
        </form>

        {/* Mailboxen */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-800 mb-1 pb-2 border-b">Mailboxen</h2>
          <p className="text-xs text-gray-500 mt-2 mb-4">
            Je kunt meerdere mailadressen koppelen. De primaire mailbox wordt standaard gebruikt.
          </p>

          {accounts.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3 mb-4">
              Nog geen mailbox gekoppeld. Voeg hieronder je eerste account toe.
            </div>
          ) : (
            <ul className="space-y-2 mb-6">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center justify-between border border-gray-200 rounded-md px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800 truncate">{a.display_naam || a.mail_adres}</span>
                      {a.is_primary && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-[#333399] text-white px-2 py-0.5 rounded-full">Primair</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        a.mail_status === "actief" ? "bg-emerald-100 text-emerald-800" :
                        a.mail_status === "fout" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {a.mail_status === "actief" ? "Actief" : a.mail_status === "fout" ? "Fout" : "Onbekend"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">{a.mail_adres}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!a.is_primary && (
                      <form action={maakPrimair}>
                        <input type="hidden" name="id" value={a.id} />
                        <button type="submit" className="text-xs text-[#333399] hover:underline font-semibold">Maak primair</button>
                      </form>
                    )}
                    <form action={verwijderMailAccount}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline font-semibold">Verwijder</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Nieuw account form */}
          <form action={nieuwMailAccount} className="border-t pt-4 space-y-3">
            <h3 className="font-semibold text-gray-700 text-sm">Nieuwe mailbox toevoegen</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mailadres *</label>
                <input name="mail_adres" type="email" required placeholder="naam@grywo.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Wachtwoord *</label>
                <input name="mail_wachtwoord" type="password" required placeholder="Hostnet wachtwoord" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                <small className="text-gray-400 text-xs">Versleuteld opgeslagen.</small>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Weergavenaam (optioneel)</label>
                <input name="display_naam" placeholder="bv. Werk · Sales · Persoonlijk" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input id="is_primary" name="is_primary" type="checkbox" defaultChecked={accounts.length === 0} className="rounded" />
                <label htmlFor="is_primary" className="text-xs text-gray-600">Als primaire mailbox instellen</label>
              </div>
            </div>
            <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-6 py-2 rounded-md text-sm">
              Mailbox toevoegen
            </button>
          </form>
        </div>

        {/* Mail-templates (super-admin only) */}
        {isSuperAdmin && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-1 pb-2 border-b">Mail-templates</h2>
            <p className="text-xs text-gray-500 mt-2 mb-4">
              Pas de tekst aan van automatische mails. Gebruik <code className="bg-gray-100 px-1 rounded">{`{variabele}`}</code> placeholders.
              Layout (logo, footer) en eventuele detail-tabellen worden automatisch toegevoegd.
            </p>

            <div className="space-y-4">
              {(Object.keys(TEMPLATE_META) as TemplateSleutel[]).map((sleutel) => {
                const meta = TEMPLATE_META[sleutel];
                const huidig = templates[sleutel] ?? DEFAULT_BODIES[sleutel];
                const isOverride = sleutel in templates;
                return (
                  <details key={sleutel} className="border border-gray-200 rounded-md">
                    <summary className="cursor-pointer px-4 py-3 bg-gray-50 rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-gray-800">{meta.naam}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{meta.beschrijving}</div>
                      </div>
                      {isOverride && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Aangepast</span>
                      )}
                    </summary>
                    <div className="p-4 border-t border-gray-200">
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-gray-600">Variabelen: </span>
                        {meta.vars.map((v) => (
                          <code key={v} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded mr-1">
                            {`{${v}}`}
                          </code>
                        ))}
                      </div>
                      <form action={updateMailTemplate} className="space-y-3">
                        <input type="hidden" name="sleutel" value={sleutel} />
                        <textarea
                          name="body_html"
                          defaultValue={huidig}
                          rows={10}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:border-[#333399]"
                        />
                        <div className="flex items-center gap-2">
                          <button type="submit" className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-4 py-1.5 rounded-md text-xs">
                            Opslaan
                          </button>
                          {isOverride && (
                            <button
                              type="submit"
                              formAction={resetMailTemplate}
                              className="text-xs text-gray-600 hover:text-red-600 underline"
                            >
                              Terug naar standaard
                            </button>
                          )}
                        </div>
                      </form>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
