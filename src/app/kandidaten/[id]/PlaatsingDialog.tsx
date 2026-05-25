"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { X, Loader2, CheckCircle } from "lucide-react";
import { meldPlaatsing } from "./plaatsing-actions";

type VoorstelOpt = {
  id: string;
  bedrijf: string | null;
  opdrachtgever_naam: string | null;
  opdrachtgever_email: string;
  contactpersoon: string | null;
  contact_telefoon: string | null;
  contact_email: string | null;
};

function VerstuurKnop() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold px-6 py-2 rounded-md text-sm inline-flex items-center gap-2"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
      Verzenden naar backoffice
    </button>
  );
}

export function PlaatsingDialog({
  open,
  onClose,
  kandidaatId,
  kandidaatNaam,
  voorstellen,
}: {
  open: boolean;
  onClose: () => void;
  kandidaatId: string;
  kandidaatNaam: string;
  voorstellen: VoorstelOpt[];
}) {
  const [basis, setBasis] = useState<"uitzend" | "werving_selectie">("werving_selectie");
  const [voorstelId, setVoorstelId] = useState<string>(voorstellen[0]?.id ?? "");
  const gekozen = voorstellen.find(v => v.id === voorstelId);

  const [bedrijf, setBedrijf]                 = useState(gekozen?.bedrijf ?? gekozen?.opdrachtgever_naam ?? "");
  const [contactpersoon, setContactpersoon]   = useState(gekozen?.contactpersoon ?? gekozen?.opdrachtgever_naam ?? "");
  const [contactEmail, setContactEmail]       = useState(gekozen?.contact_email ?? gekozen?.opdrachtgever_email ?? "");
  const [contactTelefoon, setContactTelefoon] = useState(gekozen?.contact_telefoon ?? "");

  // Auto-fill bedrijfs-velden bij voorstelwijziging
  useEffect(() => {
    if (!gekozen) return;
    setBedrijf(gekozen.bedrijf ?? gekozen.opdrachtgever_naam ?? "");
    setContactpersoon(gekozen.contactpersoon ?? gekozen.opdrachtgever_naam ?? "");
    setContactEmail(gekozen.contact_email ?? gekozen.opdrachtgever_email ?? "");
    setContactTelefoon(gekozen.contact_telefoon ?? "");
  }, [voorstelId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Plaatsing aanmelden — {kandidaatNaam}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <form action={meldPlaatsing} className="p-6 space-y-5">
          <input type="hidden" name="kandidaat_id" value={kandidaatId} />
          <input type="hidden" name="voorstel_id" value={voorstelId} />

          {voorstellen.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bijbehorend voorstel</label>
              <select
                value={voorstelId}
                onChange={(e) => setVoorstelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Geen / handmatig invullen</option>
                {voorstellen.map(v => (
                  <option key={v.id} value={v.id}>
                    {(v.bedrijf ?? v.opdrachtgever_naam ?? "Onbekend")} — {v.opdrachtgever_email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Basis */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Op welke basis?</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["werving_selectie", "Werving & Selectie"],
                ["uitzend", "Uitzendbasis"],
              ] as const).map(([w, label]) => (
                <label
                  key={w}
                  className={`cursor-pointer border-2 rounded-md px-4 py-3 text-sm font-semibold text-center ${
                    basis === w ? "border-[#333399] bg-[#333399]/5 text-[#333399]" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="basis"
                    value={w}
                    checked={basis === w}
                    onChange={() => setBasis(w)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Tarief — afhankelijk van basis */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Afgesproken tarief {basis === "uitzend" ? "(factor)" : "(percentage)"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(basis === "uitzend"
                ? [["2.3", "Factor 2,3"], ["2.4", "Factor 2,4"], ["2.5", "Factor 2,5"]]
                : [["15", "15%"], ["16", "16%"], ["17", "17%"]]
              ).map(([w, label]) => (
                <label
                  key={w}
                  className="cursor-pointer border-2 rounded-md px-3 py-2 text-sm font-semibold text-center border-gray-200 text-gray-600 hover:border-gray-300 has-[:checked]:border-[#333399] has-[:checked]:bg-[#333399]/5 has-[:checked]:text-[#333399]"
                >
                  <input
                    type="radio"
                    name="tarief"
                    value={w}
                    required
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Betaling */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Betalingsconditie</label>
            <div className="space-y-2">
              {([
                ["1x_7d", "100% binnen 7 dagen"],
                ["50_50_7d_30d", "50% binnen 7 dagen, 50% na 30 dagen"],
              ] as const).map(([w, label]) => (
                <label
                  key={w}
                  className="cursor-pointer block border-2 rounded-md px-4 py-2.5 text-sm font-medium text-gray-700 border-gray-200 hover:border-gray-300 has-[:checked]:border-[#333399] has-[:checked]:bg-[#333399]/5 has-[:checked]:text-[#333399]"
                >
                  <input
                    type="radio"
                    name="betaling"
                    value={w}
                    required
                    className="mr-2 accent-[#333399]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Klant-info */}
          <div className="border-t pt-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Klantgegevens</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Bedrijf *</label>
                <input
                  name="bedrijf"
                  required
                  value={bedrijf}
                  onChange={(e) => setBedrijf(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contactpersoon</label>
                <input
                  name="contactpersoon"
                  value={contactpersoon}
                  onChange={(e) => setContactpersoon(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                <input
                  name="contact_telefoon"
                  value={contactTelefoon}
                  onChange={(e) => setContactTelefoon(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
                <input
                  name="contact_email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Opmerking (optioneel)</label>
            <textarea
              name="opmerking"
              rows={2}
              placeholder="Extra context voor de backoffice..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 hover:underline px-4 py-2"
            >
              Annuleer
            </button>
            <VerstuurKnop />
          </div>
        </form>
      </div>
    </div>
  );
}
