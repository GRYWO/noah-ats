"use client";

import { Trash2 } from "lucide-react";
import { verwijderSetter } from "./actions";

export function DeleteSetterButton({ id, naam }: { id: string; naam: string }) {
  return (
    <form
      action={verwijderSetter}
      onSubmit={(e) => {
        if (!confirm(`Weet je zeker dat je ${naam} wil verwijderen?`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={`${naam} verwijderen`}
        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </form>
  );
}
