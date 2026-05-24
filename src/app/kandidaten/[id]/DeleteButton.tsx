"use client";

import { deleteKandidaat } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteKandidaat}
      onSubmit={(e) => {
        if (!confirm("Weet je zeker dat je deze kandidaat wil verwijderen?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-red-600 hover:text-red-700 text-sm px-4 py-2"
      >
        Verwijderen
      </button>
    </form>
  );
}
