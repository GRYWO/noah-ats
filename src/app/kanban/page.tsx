import { createClient } from "@/utils/supabase/server";
import { TopBar } from "@/components/TopBar";
import { KanbanBoard } from "./KanbanBoard";
import { PaginaTour } from "@/components/PaginaTour";
import { TOUR_KANBAN } from "@/utils/pagina-tours";

export default async function KanbanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: kandidaten } = await supabase
    .from("kandidaten")
    .select("id, voornaam, tussenvoegsel, achternaam, kanban_stap, score, open_voor")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="kanban" />
      <PaginaTour pad="/kanban" naam="Kanban" stappen={TOUR_KANBAN} />

      <div className="p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Kanban</h1>
          <p className="text-gray-500 text-sm">Sleep kandidaten tussen kolommen om de status te wijzigen</p>
        </div>

        <KanbanBoard initialKandidaten={kandidaten ?? []} />
      </div>
    </main>
  );
}
