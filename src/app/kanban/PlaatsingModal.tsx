"use client";

import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { plaatsViaKanban, getVoorstellenVoorKandidaat } from "./plaats-actions";

type Voorstel = {
  id: string;
  bedrijf: string | null;
  opdrachtgever_naam: string | null;
  contactpersoon: string | null;
  contact_email: string | null;
  opdrachtgever_email: string | null;
  contact_telefoon: string | null;
  created_at: string;
};

type Props = {
  open: boolean;
  kandidaatId: string;
  kandidaatNaam: string;
  onAnnuleer: () => void;
  onSucces: () => void;
};

export function PlaatsingModal({ open, kandidaatId, kandidaatNaam, onAnnuleer, onSucces }: Props) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [voorstellen, setVoorstellen] = useState<Voorstel[]>([]);
  const [gekozenVoorstelId, setGekozenVoorstelId] = useState<string>("");

  // Form state
  const [bedrijf, setBedrijf] = useState("");
  const [contactpersoon, setContactpersoon] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTelefoon, setContactTelefoon] = useState("");
  const [basis, setBasis] = useState<"werving_selectie" | "uitzend">("werving_selectie");
  const [tariefPct, setTariefPct] = useState("15");
  const [tariefFactor, setTariefFactor] = useState("2.3");

  useEffect(() => {
    if (!open) return;
    setFout(null);
    getVoorstellenVoorKandidaat(kandidaatId).then((vs) => {
      setVoorstellen(vs);
      if (vs.length > 0) {
        // Auto-vul met meest recente voorstel
        kiesVoorstel(vs[0].id, vs);
      }
    });
  }, [open, kandidaatId]);

  function kiesVoorstel(id: string, lijst: Voorstel[] = voorstellen) {
    setGekozenVoorstelId(id);
    if (id === "anders") {
      setBedrijf("");
      setContactpersoon("");
      setContactEmail("");
      setContactTelefoon("");
      return;
    }
    const v = lijst.find((x) => x.id === id);
    if (!v) return;
    setBedrijf(v.bedrijf ?? v.opdrachtgever_naam ?? "");
    setContactpersoon(v.contactpersoon ?? v.opdrachtgever_naam ?? "");
    setContactEmail(v.contact_email ?? v.opdrachtgever_email ?? "");
    setContactTelefoon(v.contact_telefoon ?? "");
  }

  async function verstuur() {
    setBezig(true);
    setFout(null);
    const tarief = basis === "uitzend" ? tariefFactor : tariefPct;
    const r = await plaatsViaKanban({
      kandidaatId,
      bedrijf: bedrijf.trim(),
      contactpersoon: contactpersoon.trim(),
      contactEmail: contactEmail.trim(),
      contactTelefoon: contactTelefoon.trim(),
      basis,
      tarief,
    });
    setBezig(false);
    if (!r.ok) {
      setFout(r.error ?? "Plaatsing mislukt");
      return;
    }
    if (r.error) {
      // Plaatsing wel gelukt, mail-warning tonen maar verder gaan
      console.warn("[plaatsing] warning:", r.error);
    }
    onSucces();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Kandidaat plaatsen</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Bevestig de plaatsing van <b>{kandidaatNaam}</b>
            </p>
          </div>
          <button
            onClick={onAnnuleer}
            disabled={bezig}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Voorstellen-keuze (alleen tonen als er meer dan 1 is) */}
          {voorstellen.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Bij welk bedrijf is hij/zij geplaatst?
              </label>
              <div className="space-y-1.5">
                {voorstellen.map((v) => (
                  <label
                    key={v.id}
                    className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      gekozenVoorstelId === v.id
                        ? "border-[#333399] bg-[#333399]/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={gekozenVoorstelId === v.id}
                      onChange={() => kiesVoorstel(v.id)}
                      className="mt-1 accent-[#333399]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">
                        {v.bedrijf ?? v.opdrachtgever_naam ?? "Onbekend bedrijf"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {v.contactpersoon ?? "—"} ·{" "}
                        {new Date(v.created_at).toLocaleDateString("nl-NL")}
                      </div>
                    </div>
                  </label>
                ))}
                <label
                  className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    gekozenVoorstelId === "anders"
                      ? "border-[#333399] bg-[#333399]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    checked={gekozenVoorstelId === "anders"}
                    onChange={() => kiesVoorstel("anders")}
                    className="mt-1 accent-[#333399]"
                  />
                  <div className="text-sm font-semibold text-gray-800">
                    Anders — handmatig invullen
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Kandidaat-naam (read-only) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Kandidaat
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
              {kandidaatNaam}
            </div>
          </div>

          {/* Klant-naam */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Naam klant (bedrijf) *
            </label>
            <input
              value={bedrijf}
              onChange={(e) => setBedrijf(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Contactpersoon *
              </label>
              <input
                value={contactpersoon}
                onChange={(e) => setContactpersoon(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Telefoonnummer
              </label>
              <input
                value={contactTelefoon}
                onChange={(e) => setContactTelefoon(e.target.value)}
                placeholder="+31 6 ..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              E-mail contactpersoon *
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              placeholder="contact@klant.nl"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#333399]"
            />
            <p className="text-xs text-gray-400 mt-1">
              Contract-controle uitnodiging gaat naar dit adres
            </p>
          </div>

          {/* Tarief type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Afgesproken tarief
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setBasis("werving_selectie")}
                className={`px-3 py-2 rounded-md text-sm font-semibold border-2 transition-all ${
                  basis === "werving_selectie"
                    ? "border-[#333399] bg-[#333399]/5 text-[#333399]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                W&S fee (%)
              </button>
              <button
                type="button"
                onClick={() => setBasis("uitzend")}
                className={`px-3 py-2 rounded-md text-sm font-semibold border-2 transition-all ${
                  basis === "uitzend"
                    ? "border-[#333399] bg-[#333399]/5 text-[#333399]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Uitzend (factor)
              </button>
            </div>

            {basis === "werving_selectie" ? (
              <div className="grid grid-cols-3 gap-2">
                {["15", "16", "17"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTariefPct(p)}
                    className={`px-3 py-2.5 rounded-md text-sm font-bold border-2 transition-all ${
                      tariefPct === p
                        ? "border-[#333399] bg-[#333399] text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {["2.3", "2.4", "2.5"].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTariefFactor(f)}
                    className={`px-3 py-2.5 rounded-md text-sm font-bold border-2 transition-all ${
                      tariefFactor === f
                        ? "border-[#333399] bg-[#333399] text-white"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {fout && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {fout}
            </div>
          )}

          {/* Info-blok */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
            <b>Wat gebeurt er na bevestigen?</b>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              <li>Plaatsings-mail naar backoffice@grywo.nl</li>
              {basis === "werving_selectie" && (
                <li>Contract-controle uitnodiging naar {contactEmail || "klant"}</li>
              )}
              <li>Kandidaat krijgt status &quot;Geplaatst&quot;</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onAnnuleer}
            disabled={bezig}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Annuleren
          </button>
          <button
            onClick={verstuur}
            disabled={bezig || !bedrijf.trim() || !contactpersoon.trim() || !contactEmail.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-md text-sm inline-flex items-center gap-2"
          >
            {bezig ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Bezig met versturen...
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Bevestigen en verzenden
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
