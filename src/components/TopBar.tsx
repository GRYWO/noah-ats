import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { logout } from "@/app/login/actions";
import { SideBar } from "./SideBar";
import { EodHerinneringBanner } from "./EodHerinneringBanner";
import { SnelZoeken } from "./SnelZoeken";
import { AutoRefresh } from "./AutoRefresh";
import { DemoModusBanner } from "./DemoModusBanner";
import { HuisstijlInjector } from "./HuisstijlInjector";
import { leesViewAs, effectieveRol } from "@/utils/view-as";
import { isSalesAdmin } from "@/utils/sales-admin";

type Props = {
  active?: "dashboard" | "bureaus" | "kandidaten" | "kanban" | "agenda" | "voorstellen" | "opdrachtgevers" | "robin" | "jobdigger" | "inbox" | "setters" | "coaching" | "instellingen";
};

export async function TopBar({ active }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, menu_permissions, laatst_actief_op")
    .eq("id", user?.id ?? "")
    .single();

  // Throttled "wie-is-online" tracking — max 1 update per minuut per user
  if (user && profile) {
    const laatste = profile.laatst_actief_op ? new Date(profile.laatst_actief_op).getTime() : 0;
    if (Date.now() - laatste > 60 * 1000) {
      // Fire-and-forget — geen await zodat page load niet vertraagd
      supabase.from("profiles")
        .update({ laatst_actief_op: new Date().toISOString() })
        .eq("id", user.id)
        .then(() => {});
    }
  }

  const echteIsSuperAdmin = isSuperAdminEmail(user?.email);

  // Demo-modus override: super-admin mag zich voordoen als admin/setter/recruiter
  const viewAs = await leesViewAs();
  const { rol: actieveRol, demoActief } = effectieveRol(profile?.rol, echteIsSuperAdmin, viewAs);

  // Effectief: in demo-modus is de user geen super-admin meer voor UI
  const isSuperAdmin = echteIsSuperAdmin && !demoActief;
  const isSetter = actieveRol === "setter";
  const isRecruiter = actieveRol === "recruiter";
  // Bureau-admin = admin rol zonder super-admin, of demo "bureau_admin"
  const isBureauAdmin = viewAs === "bureau_admin" || (actieveRol === "admin" && !isSuperAdmin && !demoActief);
  // Sales-admin (Pepijn): mag bureaus + abonnementen aanmaken
  const isSalesAdminFlag = !demoActief && (await isSalesAdmin(user));
  // In demo-modus negeren we eigen menu_permissions — anders worden Yorith's
  // persoonlijke menu-toggles toegepast op de demo-rol (= incorrecte preview).
  const menuPermissions = demoActief
    ? null
    : (profile?.menu_permissions ?? null) as Record<string, boolean> | null;

  return (
    <>
      <HuisstijlInjector />
      <DemoModusBanner />
      <EodHerinneringBanner />
      <SideBar
        active={active}
        userEmail={user?.email ?? ""}
        userId={user?.id ?? ""}
        isSuperAdmin={isSuperAdmin}
        isSalesAdmin={isSalesAdminFlag}
        isSetter={isSetter}
        isRecruiter={isRecruiter}
        isBureauAdmin={isBureauAdmin}
        menuPermissions={menuPermissions}
        logoutAction={logout}
      />
      <SnelZoeken />
      <AutoRefresh />
    </>
  );
}
