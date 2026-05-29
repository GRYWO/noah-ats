"use client";

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
      <button type="submit" className="text-red-600 hover:text-red-700 text-sm">
        Verwijderen
      </button>
    </form>
  );
}
