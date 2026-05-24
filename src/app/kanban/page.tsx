import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { logout } from "../login/actions";
import { KanbanBoard } from "./KanbanBoard";

export default async function KanbanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: kandidaten } = await supabase
    .from("kandidaten")
    .select("id, voornaam, tussenvoegsel, achternaam, kanban_stap, score, open_voor")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f4f4f7]">
      <div className="bg-[#333399] h-16 flex items-center px-6 shadow-md">
        <Link href="/dashboard" className="flex items-baseline">
          <span className="text-white text-3xl font-black tracking-tighter">noah</span>
          <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block"></span>
        </Link>
        <nav className="ml-8 flex gap-1">
          <Link href="/dashboard" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Dashboard</Link>
          <Link href="/kandidaten" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Kandidaten</Link>
          <Link href="/kanban" className="text-white bg-white/15 px-3 py-1.5 text-sm rounded-md">Kanban</Link>
          <Link href="/setters" className="text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10">Setters</Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-white/90 text-sm">{user?.email}</span>
          <form action={logout}>
            <button className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1.5 rounded-md">Uitloggen</button>
          </form>
        </div>
      </div>

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
