import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { logout } from "@/app/login/actions";

type Props = {
  active?: "dashboard" | "bureaus" | "kandidaten" | "kanban" | "opdrachtgevers" | "inbox" | "setters" | "instellingen";
};

export async function TopBar({ active }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user?.id ?? "")
    .single();

  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const isSetter = profile?.rol === "setter";

  const item = (key: string, href: string, label: string) => {
    const isActive = active === key;
    return (
      <Link
        href={href}
        className={
          isActive
            ? "text-white bg-white/15 px-3 py-1.5 text-sm rounded-md"
            : "text-white/70 hover:text-white px-3 py-1.5 text-sm rounded-md hover:bg-white/10"
        }
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="bg-[#333399] h-16 flex items-center px-6 shadow-md">
      <Link href="/dashboard" className="flex items-baseline">
        <span className="text-white text-3xl font-black tracking-tighter">noah</span>
        <span className="ml-1.5 w-2.5 h-2.5 rounded-full bg-[#ffd84d] inline-block"></span>
      </Link>
      <nav className="ml-8 flex gap-1">
        {item("dashboard", "/dashboard", "Dashboard")}
        {isSuperAdmin && item("bureaus", "/bureaus", "Bureaus")}
        {item("kandidaten", "/kandidaten", "Kandidaten")}
        {item("kanban", "/kanban", "Kanban")}
        {item("opdrachtgevers", "/opdrachtgevers", "CRM")}
        {item("inbox", "/inbox", "E-mail")}
        {!isSetter && item("setters", "/setters", "Setters")}
        {item("instellingen", "/instellingen", "Instellingen")}
      </nav>
      <div className="ml-auto flex items-center gap-4">
        <span className="text-white/90 text-sm">{user?.email}</span>
        <form action={logout}>
          <button className="bg-white/15 hover:bg-white/25 text-white text-sm px-3 py-1.5 rounded-md">
            Uitloggen
          </button>
        </form>
      </div>
    </div>
  );
}
