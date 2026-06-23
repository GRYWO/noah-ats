"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type Vondst = {
  id: string;
  titel: string | null;
  bedrijf: string | null;
  plaats: string | null;
  telefoon: string | null;
  url: string | null;
  datum: string | null;
  isBureau: boolean;
};

// Toont de gevonden vacatures met een filter om uitzend-/bemiddelingsbureaus te
// verbergen. De keuze wordt onthouden (localStorage), zodat hij aan blijft staan.
export function JobdiggerResultaten({ vondsten }: { vondsten: Vondst[] }) {
  const [verbergBureaus, setVerbergBureaus] = useState(false);

  useEffect(() => {
    setVerbergBureaus(localStorage.getItem("noah-verberg-bureaus") === "1");
  }, []);

  function toggle(aan: boolean) {
    setVerbergBureaus(aan);
    try {
      localStorage.setItem("noah-verberg-bureaus", aan ? "1" : "0");
    } catch {}
  }

  const zichtbaar = verbergBureaus ? vondsten.filter((v) => !v.isBureau) : vondsten;
  const verborgen = vondsten.length - zichtbaar.length;

  return (
    <>
      <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600">
        <input
          type="checkbox"
          checked={verbergBureaus}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 accent-[#333399]"
        />
        Uitzendbureaus verbergen
        {verbergBureaus && verborgen > 0 && (
          <span className="font-normal text-gray-400">· {verborgen} verborgen</span>
        )}
      </label>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Functie</th>
              <th className="px-4 py-2 text-left">Bedrijf</th>
              <th className="px-4 py-2 text-left">Plaats</th>
              <th className="px-4 py-2 text-left">Telefoon</th>
              <th className="px-4 py-2 text-left">Website</th>
              <th className="px-4 py-2 text-left">Datum</th>
              <th className="px-4 py-2 text-right">Actie</th>
            </tr>
          </thead>
          <tbody>
            {zichtbaar.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Geen vacatures om te tonen{verbergBureaus ? " (uitzendbureaus verborgen)" : ""}.
                </td>
              </tr>
            ) : (
              zichtbaar.map((vd) => (
                <tr key={vd.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-800">
                    <Link
                      href={`/vacature-aanmaken/nieuw?vondst=${vd.id}`}
                      className="font-medium hover:text-[#333399] hover:underline"
                      title="Bekijk en plaats deze vacature"
                    >
                      {vd.titel ?? "Onbekende functie"}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{vd.bedrijf ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{vd.plaats ?? "-"}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {vd.telefoon ? (
                      <a href={`tel:${vd.telefoon}`} className="text-[#333399] hover:underline">{vd.telefoon}</a>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {vd.url ? (
                      <a href={vd.url.startsWith("http") ? vd.url : `https://${vd.url}`} target="_blank" rel="noopener noreferrer" className="text-[#333399] hover:underline">
                        {vd.url.replace(/^https?:\/\//, "")}
                      </a>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{vd.datum ?? "-"}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <Link
                      href={`/vacature-aanmaken/nieuw?vondst=${vd.id}`}
                      className="btn-gold inline-block px-3 py-1.5 text-xs"
                    >
                      Plaats →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
