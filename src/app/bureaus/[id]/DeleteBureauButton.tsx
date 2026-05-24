"use client";

import { verwijderBureau } from "./actions";

export function DeleteBureauButton({ id, naam }: { id: string; naam: string }) {
  return (
    <form
      action={verwijderBureau}
      onSubmit={(e) => {
        if (!confirm(`Weet je zeker dat je ${naam} wil verwijderen? Dit verwijdert ook alle users + kandidaten van dit bureau!`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-red-600 hover:text-red-700 text-sm px-4 py-2">
        Bureau verwijderen
      </button>
    </form>
  );
}
