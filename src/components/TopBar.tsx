import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { logout } from "@/app/login/actions";
import { SideBar } from "./SideBar";
import { EodHerinneringBanner } from "./EodHerinneringBanner";
import { SnelZoeken } from "./SnelZoeken";
import { AutoRefresh } from "./AutoRefresh";
import { DemoModusBanner } from "./DemoModusBanner";
import { ProefperiodeBanner } from "./ProefperiodeBanner";
import { HuisstijlInjector } from "./HuisstijlInjector";
import { leesViewAs, effectieveRol } from "@/utils/view-as";
import { isSalesAdmin } from "@/utils/sales-admin";

type Props = {
  active?: "dashboard" | "bureaus" | "kandidaten" | "kanban" | "agenda" | "voorstellen" | "opdrachtgevers" | "robin" | "jobdigger" | "inbox" | "setters" | "coaching" | "instellingen";
};

export async function TopBar({ active }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Was: 3 sequentiële queries (profile, viewAs cookie, isSalesAdmin → eigen profile-fetch)
  // Nu: 1 grotere profile query met kan_abonnementen_beheren erbij + viewAs parallel.
  // Bespaart ~50-100ms per pageload — TopBar rendert op ELKE page.
  const [profileRes, viewAs] = await Promise.all([
    supabase
      .from("profiles")
      .select("rol, menu_permissions, laatst_actief_op, kan_abonnementen_beheren, is_intern_personeel")
      .eq("id", user?.id ?? "")
      .single(),
    leesViewAs(),
  ]);
  const profile = profileRes.data;

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
  const { rol: actieveRol, demoActief } = effectieveRol(profile?.rol, echteIsSuperAdmin, viewAs);

  // Effectief: in demo-modus is de user geen super-admin meer voor UI
  const isSuperAdmin = echteIsSuperAdmin && !demoActief;
  const isSetter = actieveRol === "setter";
  const isRecruiter = actieveRol === "recruiter";
  // Intern GRYWO-personeel (zoals Wouter): geen super-admin, maar ook geen bureau-admin
  // — moet de volle admin-sidebar zien (Jobdigger, Robin, Kandidaten, etc.)
  const isInternPersoneel = !!profile?.is_intern_personeel || !!profile?.kan_abonnementen_beheren;
  // Bureau-admin = admin rol zonder super-admin én geen intern personeel, of demo "bureau_admin"
  const isBureauAdmin = viewAs === "bureau_admin" || (actieveRol === "admin" && !isSuperAdmin && !isInternPersoneel && !demoActief);
  // Sales-admin (Pepijn): super-admin OF kan_abonnementen_beheren=true.
  // Geen aparte DB-call meer — komt uit dezelfde profile-query.
  const isSalesAdminFlag = !demoActief && (echteIsSuperAdmin || !!profile?.kan_abonnementen_beheren);
  // Silence unused-import warning na bovenstaande refactor
  void isSalesAdmin;
  // In demo-modus negeren we eigen menu_permissions — anders worden Yorith's
  // persoonlijke menu-toggles toegepast op de demo-rol (= incorrecte preview).
  const menuPermissions = demoActief
    ? null
    : (profile?.menu_permissions ?? null) as Record<string, boolean> | null;

  return (
    <>
      <HuisstijlInjector />
      <DemoModusBanner />
      <ProefperiodeBanner />
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
