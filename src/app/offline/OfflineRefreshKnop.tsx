"use client";

export function OfflineRefreshKnop() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.location.reload();
      }}
      className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-white font-medium shadow-md hover:opacity-90 transition-opacity"
      style={{ backgroundColor: "#333399" }}
    >
      Opnieuw proberen
    </button>
  );
}
