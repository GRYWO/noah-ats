import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { KanbanBoard } from "./KanbanBoard";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_KANBAN } from "@/utils/pagina-tours";
import { getViewerRol } from "@/utils/view-as";
import { isSuperAdminEmail } from "@/utils/auth";
import { logPerf } from "@/utils/perf";

// Deze mensen zien álle kandidaten op de kanban; iedereen anders ziet alleen
// de eigen kandidaten.
const ZIET_ALLE_KANDIDATEN = new Set([
  "pepijn@noah-recruitment.nl",
  "wouter@noah-recruitment.nl",
]);

export default async function KanbanPage() {
  const t0 = performance.now();
  const supabase = await createClient();

  // user + viewerRol parallel
  const [{ data: { user } }, { isSetter, isRecruiter }] = await Promise.all([
    supabase.auth.getUser(),
    getViewerRol(),
  ]);

  let q = supabase
    .from("kandidaten")
    .select("id, voornaam, tussenvoegsel, achternaam, kanban_stap, score, open_voor")
    .order("created_at", { ascending: false })
    .limit(500); // Kanban toont max 500 — anders DOM te zwaar bij grote boards

  const email = (user?.email ?? "").toLowerCase();
  const magAlles = !(isSetter || isRecruiter) || isSuperAdminEmail(email) || ZIET_ALLE_KANDIDATEN.has(email);
  if (!magAlles && user?.id) {
    q = q.eq("eigenaar_id", user.id);
  }

  const { data: kandidaten } = await q;

  logPerf({
    pad: "/kanban",
    type: "page",
    duur_ms: performance.now() - t0,
    user_id: user?.id,
    extra: { kandidaten: kandidaten?.length ?? 0, isSetter, isRecruiter },
  });

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kanban" />
      <PaginaTour pad="/kanban" naam="Kanban" stappen={TOUR_KANBAN} />

      <div className="p-6">
        <div className="gold-hr mb-5 rounded-full" />
        <div className="mb-4">
          <span className="gold-chip inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
            Noah<span className="text-gold">.</span>&nbsp;recruitment
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-800">Kanban</h1>
          <p className="text-gray-500 text-sm">Sleep kandidaten tussen kolommen om de status te wijzigen.</p>
        </div>

        <KanbanBoard initialKandidaten={kandidaten ?? []} isSetter={isSetter} />
      </div>
    </main>
  );
}
