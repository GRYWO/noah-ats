"use client";

import { useState, useRef } from "react";
import { Camera, Trash2, Loader2 } from "lucide-react";
import { uploadAvatar, verwijderAvatar } from "./avatar-actions";

type Props = {
  huidigeUrl: string | null;
  voornaam: string | null;
  achternaam: string | null;
};

export function AvatarSectie({ huidigeUrl, voornaam, achternaam }: Props) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initialen = `${voornaam?.[0] ?? ""}${achternaam?.[0] ?? ""}`.toUpperCase() || "?";

  async function upload(file: File) {
    setFout(null);
    setBezig(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const r = await uploadAvatar(fd);
    if (!r.ok) setFout(r.error ?? "Upload mislukt");
    setBezig(false);
  }

  async function verwijderen() {
    if (!confirm("Foto verwijderen?")) return;
    setBezig(true);
    await verwijderAvatar();
    setBezig(false);
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-800 mb-1">Profielfoto</h2>
      <p className="text-sm text-gray-500 mb-4">
        Jouw foto verschijnt in plaats van de initialen door de hele app.
      </p>

      <div className="flex items-center gap-5">
        {/* Avatar preview */}
        <div className="relative">
          {huidigeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={huidigeUrl}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#333399] text-white text-2xl font-bold flex items-center justify-center">
              {initialen}
            </div>
          )}
          {bezig && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <Loader2 className="animate-spin text-white" size={20} />
            </div>
          )}
        </div>

        {/* Acties */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={bezig}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#333399] hover:bg-[#2a2a80] text-white rounded-md text-sm font-semibold disabled:opacity-60"
          >
            <Camera size={14} />
            {huidigeUrl ? "Andere foto" : "Foto uploaden"}
          </button>
          {huidigeUrl && (
            <button
              type="button"
              onClick={verwijderen}
              disabled={bezig}
              className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm font-semibold disabled:opacity-60"
            >
              <Trash2 size={14} />
              Verwijderen
            </button>
          )}
          <p className="text-xs text-gray-400">Max 2MB · JPG, PNG, WebP, GIF</p>
        </div>
      </div>

      {fout && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {fout}
        </div>
      )}
    </section>
  );
}
