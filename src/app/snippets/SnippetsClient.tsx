"use client";

import { useState } from "react";

type Snippet = {
  id: string;
  naam: string;
  tekst: string;
  sneltoets: string | null;
  gemaakt_op?: string | null;
};

type Props = {
  initieel: Snippet[];
};

type Modus =
  | { soort: "dicht" }
  | { soort: "nieuw" }
  | { soort: "bewerk"; snippet: Snippet };

export function SnippetsClient({ initieel }: Props) {
  const [snippets, setSnippets] = useState<Snippet[]>(initieel);
  const [modus, setModus] = useState<Modus>({ soort: "dicht" });
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function bewaar(form: { id?: string; naam: string; tekst: string; sneltoets: string }) {
    setBezig(true);
    setFout(null);
    try {
      const isUpdate = !!form.id;
      const res = await fetch("/api/inbox/snippets", {
        method: isUpdate ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          naam: form.naam,
          tekst: form.tekst,
          sneltoets: form.sneltoets || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error ?? "Fout bij opslaan");
        return;
      }
      if (isUpdate) {
        setSnippets((lijst) =>
          lijst.map((s) => (s.id === data.snippet.id ? data.snippet : s))
            .sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
        );
      } else {
        setSnippets((lijst) =>
          [...lijst, data.snippet].sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
        );
      }
      setModus({ soort: "dicht" });
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  }

  async function verwijder(id: string) {
    if (!confirm("Deze snippet verwijderen?")) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/inbox/snippets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error ?? "Fout bij verwijderen");
        return;
      }
      setSnippets((lijst) => lijst.filter((s) => s.id !== id));
    } catch (e) {
      setFout((e as Error).message);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {snippets.length} {snippets.length === 1 ? "snippet" : "snippets"}
        </div>
        <button
          type="button"
          onClick={() => setModus({ soort: "nieuw" })}
          className="bg-[#333399] hover:bg-[#2a2a80] text-white text-sm font-semibold px-4 py-2 rounded-md"
        >
          Nieuwe snippet
        </button>
      </div>

      {fout && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {fout}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {snippets.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-gray-500">
            Nog geen snippets. Klik op Nieuwe snippet om er eentje toe te voegen.
          </div>
        )}
        {snippets.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-semibold">Naam</th>
                <th className="text-left px-4 py-2 font-semibold">Code / alias</th>
                <th className="text-left px-4 py-2 font-semibold">Voorbeeld</th>
                <th className="text-right px-4 py-2 font-semibold">Acties</th>
              </tr>
            </thead>
            <tbody>
              {snippets.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.naam}</td>
                  <td className="px-4 py-3 text-gray-500">{s.sneltoets ?? ""}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.tekst.slice(0, 80)}{s.tekst.length > 80 ? "..." : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setModus({ soort: "bewerk", snippet: s })}
                      className="text-xs text-[#333399] hover:underline mr-3"
                    >
                      Bewerken
                    </button>
                    <button
                      type="button"
                      onClick={() => verwijder(s.id)}
                      disabled={bezig}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Verwijderen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modus.soort !== "dicht" && (
        <SnippetModal
          initieel={modus.soort === "bewerk" ? modus.snippet : null}
          bezig={bezig}
          onSluiten={() => setModus({ soort: "dicht" })}
          onBewaren={bewaar}
        />
      )}
    </div>
  );
}

function SnippetModal({
  initieel,
  bezig,
  onSluiten,
  onBewaren,
}: {
  initieel: Snippet | null;
  bezig: boolean;
  onSluiten: () => void;
  onBewaren: (form: { id?: string; naam: string; tekst: string; sneltoets: string }) => void;
}) {
  const [naam, setNaam] = useState(initieel?.naam ?? "");
  const [tekst, setTekst] = useState(initieel?.tekst ?? "");
  const [sneltoets, setSneltoets] = useState(initieel?.sneltoets ?? "");

  function indienen(e: React.FormEvent) {
    e.preventDefault();
    if (!naam.trim() || !tekst.trim()) return;
    onBewaren({
      id: initieel?.id,
      naam: naam.trim(),
      tekst: tekst.trim(),
      sneltoets: sneltoets.trim(),
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onSluiten}
    >
      <form
        onSubmit={indienen}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xl space-y-4"
      >
        <h2 className="text-lg font-bold text-gray-800">
          {initieel ? "Snippet bewerken" : "Nieuwe snippet"}
        </h2>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Naam *</label>
          <input
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            required
            maxLength={120}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Bijv. Vriendelijke afsluiting"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Code / alias (optioneel)
          </label>
          <input
            type="text"
            value={sneltoets}
            onChange={(e) => setSneltoets(e.target.value)}
            maxLength={32}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="bijv. afsl"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tekst *</label>
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            required
            rows={8}
            maxLength={10000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-sans"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onSluiten}
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={bezig || !naam.trim() || !tekst.trim()}
            className="bg-[#333399] hover:bg-[#2a2a80] disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-md text-sm"
          >
            {bezig ? "Bezig..." : "Opslaan"}
          </button>
        </div>
      </form>
    </div>
  );
}
