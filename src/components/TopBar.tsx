import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { logout } from "@/app/login/actions";
import { SideBar } from "./SideBar";
import { EodHerinneringBanner } from "./EodHerinneringBanner";

type Props = {
  active?: "dashboard" | "bureaus" | "kandidaten" | "kanban" | "agenda" | "voorstellen" | "opdrachtgevers" | "robin" | "jobdigger" | "inbox" | "setters" | "coaching" | "instellingen";
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

  return (
    <>
      <EodHerinneringBanner />
      <SideBar
        active={active}
        userEmail={user?.email ?? ""}
        userId={user?.id ?? ""}
        isSuperAdmin={isSuperAdmin}
        isSetter={isSetter}
        logoutAction={logout}
      />
    </>
  );
}
