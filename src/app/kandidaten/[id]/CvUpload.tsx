"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Props = {
  kandidaatId: string;
  tenantId: string;
  huidigeCvUrl: string | null;
};

export function CvUpload({ kandidaatId, tenantId, huidigeCvUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const supabase = createClient();

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);

    // path: <tenant_id>/<kandidaat_id>/<timestamp>-<filename>
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${tenantId}/${kandidaatId}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("cvs")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    // Verwijder oude CV uit storage
    if (huidigeCvUrl) {
      await supabase.storage.from("cvs").remove([huidigeCvUrl]);
    }

    // Update kandidaat record
    const { error: updateError } = await supabase
      .from("kandidaten")
      .update({ cv_url: path })
      .eq("id", kandidaatId);

    if (updateError) {
      setError(updateError.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    router.refresh();
  };

  const handleVerwijderen = async () => {
    if (!huidigeCvUrl) return;
    if (!confirm("CV verwijderen?")) return;

    setUploading(true);
    setError(null);

    await supabase.storage.from("cvs").remove([huidigeCvUrl]);
    await supabase.from("kandidaten").update({ cv_url: null }).eq("id", kandidaatId);

    setUploading(false);
    setDownloadUrl(null);
    router.refresh();
  };

  const handleOpen = async () => {
    if (!huidigeCvUrl) return;
    const { data, error } = await supabase.storage
      .from("cvs")
      .createSignedUrl(huidigeCvUrl, 60); // 60 sec geldig

    if (error || !data) {
      setError(error?.message ?? "Kon CV niet openen");
      return;
    }
    setDownloadUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div>
      {huidigeCvUrl ? (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="font-semibold text-gray-800 text-sm">
              {huidigeCvUrl.split("/").pop()?.replace(/^\d+-/, "")}
            </div>
            <div className="text-xs text-gray-500">CV staat klaar in dossier</div>
          </div>
          <button
            type="button"
            onClick={handleOpen}
            className="bg-[#333399] hover:bg-[#2a2a80] text-white text-sm px-4 py-2 rounded-md"
          >
            Bekijk
          </button>
          <button
            type="button"
            onClick={handleVerwijderen}
            disabled={uploading}
            className="text-red-600 hover:text-red-700 text-sm px-2 py-2"
          >
            Verwijderen
          </button>
        </div>
      ) : (
        <p className="text-gray-500 text-sm mb-3">Nog geen CV geüpload</p>
      )}

      <label className="block">
        <span className="sr-only">CV uploaden</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="block w-full text-sm text-gray-600
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-[#333399] file:text-white
            hover:file:bg-[#2a2a80]
            file:cursor-pointer cursor-pointer"
        />
      </label>

      {uploading && (
        <p className="text-sm text-gray-500 mt-2">Bezig met uploaden...</p>
      )}
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
