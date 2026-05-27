"use client";

import { Printer } from "lucide-react";

export function PrintKnop() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-[#333399] hover:bg-[#2a2a80] text-white font-semibold px-5 py-2 rounded-md text-sm inline-flex items-center gap-2"
    >
      <Printer size={14} />
      Print / Opslaan als PDF
    </button>
  );
}
