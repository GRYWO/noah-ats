import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { logout } from "@/app/login/actions";
import { SideBar } from "./SideBar";
import { EodHerinneringBanner } from "./EodHerinneringBanner";
import { SnelZoeken } from "./SnelZoeken";
import { AutoRefresh } from "./AutoRefresh";
import { DemoModusBanner } from "./DemoModusBanner";
import { leesViewAs, effectieveRol } from "@/utils/view-as";

type Props = {
  active?: "dashboard" | "bureaus" | "kandidaten" | "kanban" | "agenda" | "voorstellen" | "opdrachtgevers" | "robin" | "jobdigger" | "inbox" | "setters" | "coaching" | "instellingen";
};

export async function TopBar({ active }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, menu_permissions")
    .eq("id", user?.id ?? "")
    .single();

  const echteIsSuperAdmin = isSuperAdminEmail(user?.email);

  // Demo-modus override: super-admin mag zich voordoen als admin/setter/recruiter
  const viewAs = await leesViewAs();
  const { rol: actieveRol, demoActief } = effectieveRol(profile?.rol, echteIsSuperAdmin, viewAs);

  // Effectief: in demo-modus is de user geen super-admin meer voor UI
  const isSuperAdmin = echteIsSuperAdmin && !demoActief;
  const isSetter = actieveRol === "setter";
  const isRecruiter = actieveRol === "recruiter";
  // In demo-modus negeren we eigen menu_permissions — anders worden Yorith's
  // persoonlijke menu-toggles toegepast op de demo-rol (= incorrecte preview).
  const menuPermissions = demoActief
    ? null
    : (profile?.menu_permissions ?? null) as Record<string, boolean> | null;

  return (
    <>
      <DemoModusBanner />
      <EodHerinneringBanner />
      <SideBar
        active={active}
        userEmail={user?.email ?? ""}
        userId={user?.id ?? ""}
        isSuperAdmin={isSuperAdmin}
        isSetter={isSetter}
        isRecruiter={isRecruiter}
        menuPermissions={menuPermissions}
        logoutAction={logout}
      />
      <SnelZoeken />
      <AutoRefresh />
    </>
  );
}
