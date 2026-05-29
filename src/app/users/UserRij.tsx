"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2, ShieldCheck, Send, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { InlineVoysEdit } from "./InlineVoysEdit";
import { CoachToggle } from "./CoachToggle";
import { SalesAdminToggle } from "./SalesAdminToggle";
import { InternToggle } from "./InternToggle";
import { ResetWachtwoordKnop } from "./ResetWachtwoordKnop";
import { DeleteSetterButton } from "./DeleteSetterButton";
import { bewerkUser } from "./actions";
import { stuurAkkoordUit, trekAkkoordIn } from "./akkoord-actions";
import { MENU_KEYS } from "@/utils/menu-permissions";

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

type SetterRecord = {
  id: string;
  voornaam: string | null;
  achternaam: string | null;
  rol: string;
  telefoon: string | null;
  voys_nummer: string | null;
  mail_adres: string | null;
  functie_titel: string | null;
  is_coach: boolean | null;
  kan_abonnementen_beheren?: boolean | null;
  is_intern_personeel?: boolean | null;
  created_at: string | null;
  menu_permissions: Record<string, boolean> | null;
};

type AkkoordInfo = {
  id: string;
  status: string;
  token: string;
  type: string;
  verzonden_op: string;
  getekend_op: string | null;
};

type Props = {
  setter: SetterRecord;
  isHuidigeUser: boolean;
  isAdmin: boolean;
  magAlleRollen: boolean;
  /** Wordt deze user gezien als super-admin (op basis van email)? */
  isSuperAdmin: boolean;
  /** Is de huidige viewer een super-admin? Alleen dan rechten + rol tonen. */
  viewerIsSuperAdmin: boolean;
  /** Laatste NDA / gebruiksvoorwaarden status (null = nog niet verstuurd). */
  akkoord: AkkoordInfo | null;
};

/**
 * Klikbare rij in /users. Klik op de rij opent de bewerk-modal,
 * behalve op de interactieve cellen (Voys-edit, coach-toggle, acties)
 * — die hebben hun eigen click-stop in een wrapper-div.
 */
export function UserRij({ setter: s, isHuidigeUser, isAdmin, magAlleRollen, isSuperAdmin, viewerIsSuperAdmin, akkoord }: Props) {
  const [open, setOpen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Lokale state voor checkboxes (alleen relevant voor super-admin viewer)
  const initialPerms: Record<string, boolean> = {};
  for (const m of MENU_KEYS) {
    // default true tenzij expliciet false in opgeslagen perms
    initialPerms[m.key] = s.menu_permissions?.[m.key] !== false;
  }
  const [perms, setPerms] = useState<Record<string, boolean>>(initialPerms);

  function togglePerm(key: string) {
    setPerms((p) => ({ ...p, [key]: !p[key] }));
  }

  function onSubmit(fd: FormData) {
    setFout(null);
    setBezig(true);
    // Voeg menu-rechten JSON toe (alleen super-admin viewer mag dit zetten,
    // maar het is veilig om altijd mee te sturen: server-side wordt gecheckt)
    if (viewerIsSuperAdmin) {
      fd.set("menu_permissions", JSON.stringify(perms));
    }
    startTransition(async () => {
      const r = await bewerkUser(fd);
      setBezig(false);
      if (r?.error) {
        setFout(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  // Stop het rij-klik effect op interactieve cellen
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <tr
        className={`border-t hover:bg-gray-50 ${isAdmin ? "cursor-pointer" : ""}`}
        onClick={isAdmin ? () => setOpen(true) : undefined}
      >
        <td className="px-4 py-3 font-semibold text-gray-800">
          {s.voornaam} {s.achternaam}
          {isSuperAdmin && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-[#333399]/10 text-[#333399] px-1.5 py-0.5 rounded">
              <ShieldCheck size={10} /> Super admin
            </span>
          )}
          {isHuidigeUser && <span className="ml-2 text-xs text-gray-400">(jij)</span>}
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROL_KLEUREN[s.rol] ?? "bg-gray-100 text-gray-700"}`}>
            {ROL_LABELS[s.rol] ?? s.rol}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{s.telefoon ?? "—"}</td>
        <td className="px-4 py-3 text-sm" onClick={stop}>
          <InlineVoysEdit setterId={s.id} huidig={s.voys_nummer ?? null} kanBewerken={isAdmin} />
        </td>
        <td className="px-4 py-3" onClick={stop}>
          <CoachToggle userId={s.id} isCoach={!!s.is_coach} disabled={!isAdmin} />
        </td>
        <td className="px-4 py-3" onClick={stop}>
          <AkkoordCel userId={s.id} akkoord={akkoord} kanBewerken={isAdmin && !isSuperAdmin} />
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {s.created_at ? new Date(s.created_at).toLocaleDateString("nl-NL") : "—"}
        </td>
        {isAdmin && (
          <td className="px-4 py-3 text-right" onClick={stop}>
            <div className="inline-flex items-center gap-2">
              {viewerIsSuperAdmin && !isSuperAdmin && s.rol === "admin" && (
                <>
                  <InternToggle userId={s.id} actief={!!s.is_intern_personeel} />
                  <SalesAdminToggle userId={s.id} actief={!!s.kan_abonnementen_beheren} />
                </>
              )}
              <button
                type="button"
                onClick={() => setOpen(true)}
                title="Bewerken"
                className="text-gray-500 hover:text-[#333399] p-1.5 rounded-md hover:bg-gray-100"
              >
                <Pencil size={14} />
              </button>
              {!isHuidigeUser && <ResetWachtwoordKnop userId={s.id} naam={`${s.voornaam ?? ""} ${s.achternaam ?? ""}`} />}
              {!isHuidigeUser && <DeleteSetterButton id={s.id} naam={`${s.voornaam ?? ""} ${s.achternaam ?? ""}`} />}
            </div>
          </td>
        )}
      </tr>

      {/* Bewerk-modal */}
      {open && (
        <tr>
          <td colSpan={isAdmin ? 7 : 6} className="p-0">
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">User bewerken</h3>
                  <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                    <X size={16} />
                  </button>
                </div>
                <form action={onSubmit} className="p-5 grid grid-cols-2 gap-4">
                  <input type="hidden" name="id" value={s.id} />

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Voornaam *</label>
                    <input name="voornaam" defaultValue={s.voornaam ?? ""} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Achternaam *</label>
                    <input name="achternaam" defaultValue={s.achternaam ?? ""} required className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon (mobiel)</label>
                    <input name="telefoon" defaultValue={s.telefoon ?? ""} placeholder="+31 6 12345678" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Voys-nummer</label>
                    <input name="voys_nummer" defaultValue={s.voys_nummer ?? ""} placeholder="+31 85 ..." className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Mail-adres bedrijf</label>
                    <input name="mail_adres" type="email" defaultValue={s.mail_adres ?? ""} placeholder="voorbeeld@grywo.nl" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Functietitel</label>
                    <input name="functie_titel" defaultValue={s.functie_titel ?? ""} placeholder="bv. Recruitment Consultant" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    <small className="text-gray-400 text-xs">Verschijnt onder de mail-handtekening (admin altijd; recruiter/setter alleen als ingevuld)</small>
                  </div>
                  {magAlleRollen && (
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Rol</label>
                      <select name="rol" defaultValue={s.rol} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="setter">Setter</option>
                        <option value="recruiter">Recruiter</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  )}

                  {/* Menu-rechten: alleen super-admin viewer mag dit zetten,
                      en niet voor zichzelf of een andere super-admin (die hebben altijd alles). */}
                  {viewerIsSuperAdmin && !isSuperAdmin && (
                    <div className="col-span-2 pt-3 border-t">
                      <div className="text-xs font-semibold text-gray-700 mb-2 inline-flex items-center gap-1.5">
                        <ShieldCheck size={12} className="text-[#333399]" />
                        Menu-rechten — alleen aangevinkte items verschijnen in het menu
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {MENU_KEYS.map((m) => (
                          <label key={m.key} className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!perms[m.key]}
                              onChange={() => togglePerm(m.key)}
                              className="accent-[#333399]"
                            />
                            <span>{m.label}</span>
                            {m.uitleg && <span className="text-[10px] text-gray-400 ml-auto">{m.uitleg}</span>}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {fout && (
                    <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-2">
                      {fout}
                    </div>
                  )}

                  <div className="col-span-2 flex justify-end gap-2 pt-2 border-t">
                    <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600 hover:text-gray-800 px-4 py-2">
                      Annuleren
                    </button>
                    <button type="submit" disabled={bezig} className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-1.5 disabled:opacity-60">
                      {bezig && <Loader2 size={12} className="animate-spin" />}
                      Opslaan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Akkoord-cel: toont status van NDA / gebruiksvoorwaarden + actie-knop.
 */
function AkkoordCel({ userId, akkoord, kanBewerken }: { userId: string; akkoord: AkkoordInfo | null; kanBewerken: boolean }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [, startTransition] = useTransition();

  function stuur() {
    setBezig(true);
    const fd = new FormData();
    fd.set("user_id", userId);
    startTransition(async () => {
      await stuurAkkoordUit(fd);
      setBezig(false);
      router.refresh();
    });
  }
  function trekIn() {
    if (!akkoord) return;
    setBezig(true);
    const fd = new FormData();
    fd.set("id", akkoord.id);
    startTransition(async () => {
      await trekAkkoordIn(fd);
      setBezig(false);
      router.refresh();
    });
  }

  if (!akkoord) {
    return (
      <button
        type="button"
        onClick={kanBewerken ? stuur : undefined}
        disabled={!kanBewerken || bezig}
        title={kanBewerken ? "Stuur NDA / gebruiksvoorwaarden" : "Alleen door admin te versturen"}
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md ${
          kanBewerken ? "bg-[#333399]/5 text-[#333399] hover:bg-[#333399]/15" : "bg-gray-50 text-gray-400 cursor-not-allowed"
        }`}
      >
        {bezig ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
        Verstuur
      </button>
    );
  }

  if (akkoord.status === "getekend") {
    return (
      <a
        href={`/tekenen/${akkoord.token}`}
        target="_blank"
        rel="noopener noreferrer"
        title={`Getekend op ${new Date(akkoord.getekend_op!).toLocaleString("nl-NL")}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md"
      >
        <CheckCircle2 size={11} /> Getekend
      </a>
    );
  }

  if (akkoord.status === "wachtend") {
    return (
      <div className="inline-flex items-center gap-1">
        <a
          href={`/tekenen/${akkoord.token}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`Verzonden op ${new Date(akkoord.verzonden_op).toLocaleString("nl-NL")}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md"
        >
          <Clock size={11} /> Wachten
        </a>
        {kanBewerken && (
          <>
            <button
              type="button"
              onClick={stuur}
              disabled={bezig}
              title="Opnieuw sturen"
              className="text-xs text-gray-500 hover:text-[#333399] p-1"
            >
              {bezig ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            </button>
            <button
              type="button"
              onClick={trekIn}
              disabled={bezig}
              title="Intrekken"
              className="text-xs text-gray-400 hover:text-red-600 p-1"
            >
              <X size={11} />
            </button>
          </>
        )}
      </div>
    );
  }

  // ingetrokken
  return (
    <button
      type="button"
      onClick={kanBewerken ? stuur : undefined}
      disabled={!kanBewerken || bezig}
      title="Ingetrokken — klik om opnieuw te sturen"
      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
    >
      {bezig ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
      Opnieuw
    </button>
  );
}
