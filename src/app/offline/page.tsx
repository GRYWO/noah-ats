import type { Metadata } from "next";
import { OfflineRefreshKnop } from "./OfflineRefreshKnop";

export const metadata: Metadata = {
  title: "Offline - Noah ATS",
};

export default function OfflinePagina() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f4f4f7] px-6">
      <div className="max-w-sm w-full text-center">
        <div
          className="mx-auto mb-6 h-16 w-16 rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold"
          style={{ backgroundColor: "#333399" }}
        >
          N
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Offline</h1>
        <p className="text-slate-600 mb-6">
          Geen verbinding. Probeer het zo opnieuw.
        </p>
        <OfflineRefreshKnop />
      </div>
    </main>
  );
}
