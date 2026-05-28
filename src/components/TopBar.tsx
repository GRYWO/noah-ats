import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { logout } from "@/app/login/actions";
import { SideBar } from "./SideBar";
import { EodHerinneringBanner } from "./EodHerinneringBanner";
import { SnelZoeken } from "./SnelZoeken";
import { AutoRefresh } from "./AutoRefresh";

type Props = {
  active?: "dashboard" | "bureaus" | "kandidaten" | "kanban" | "agenda" | "voorstellen" | "opdrachtgevers" | "robin" | "jobdigger" | "inbox" | "setters" | "coaching" | "instellingen";
};

export async function TopBar({ active }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, menu_permissions, avatar_url, voornaam, achternaam")
    .eq("id", user?.id ?? "")
    .single();

  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const isSetter = profile?.rol === "setter";
  const menuPermissions = (profile?.menu_permissions ?? null) as Record<string, boolean> | null;

  return (
    <>
      <EodHerinneringBanner />
      <SideBar
        active={active}
        userEmail={user?.email ?? ""}
        userId={user?.id ?? ""}
        isSuperAdmin={isSuperAdmin}
        isSetter={isSetter}
        menuPermissions={menuPermissions}
        logoutAction={logout}
        avatarUrl={profile?.avatar_url ?? null}
        voornaam={profile?.voornaam ?? null}
        achternaam={profile?.achternaam ?? null}
      />
      <SnelZoeken />
      <AutoRefresh />
    </>
  );
}
