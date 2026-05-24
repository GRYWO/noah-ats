"use client";

import { verwijderOpdrachtgever, verwijderContactpersoon } from "../actions";

export function DeleteOpdrachtgeverButton({ id, naam }: { id: string; naam: string }) {
  return (
    <form
      action={verwijderOpdrachtgever}
      onSubmit={(e) => { if (!confirm(`${naam} verwijderen? Inclusief alle contactpersonen.`)) e.preventDefault(); }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-red-600 hover:text-red-700 text-sm">
        Opdrachtgever verwijderen
      </button>
    </form>
  );
}

export function DeleteContactButton({ id, opdrachtgeverId, naam }: { id: string; opdrachtgeverId: string; naam: string }) {
  return (
    <form
      action={verwijderContactpersoon}
      onSubmit={(e) => { if (!confirm(`${naam} verwijderen?`)) e.preventDefault(); }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="opdrachtgever_id" value={opdrachtgeverId} />
      <button type="submit" className="text-red-600 hover:text-red-700 text-xs">
        Verwijder
      </button>
    </form>
  );
}
