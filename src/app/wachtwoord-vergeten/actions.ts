"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendInloggegevensOpnieuw } from "@/utils/email";

function genereerWachtwoord(lengte = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pw = "";
  for (let i = 0; i < lengte; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function vraagNieuwWachtwoordAan(formData: FormData) {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  if (!email) {
    redirect("/wachtwoord-vergeten?error=E-mail+verplicht");
  }

  const admin = createAdminClient();

  try {
    // Vind auth-user via email
    const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
    const authUser = usersData.users.find(u => u.email?.toLowerCase() === email);

    if (authUser) {
      // Profile-info voor naam + rol + bedrijf
      const { data: profile } = await admin
        .from("profiles")
        .select("voornaam, rol, tenant_id")
        .eq("id", authUser.id)
        .single();

      let bedrijf = "Noah ATS";
      if (profile?.tenant_id) {
        const { data: tenant } = await admin
          .from("tenants")
          .select("naam, handelsnaam")
          .eq("id", profile.tenant_id)
          .single();
        bedrijf = tenant?.handelsnaam ?? tenant?.naam ?? bedrijf;
      }

      const nieuwWachtwoord = genereerWachtwoord(12);
      await admin.auth.admin.updateUserById(authUser.id, { password: nieuwWachtwoord });

      const rolLabel = profile?.rol === "admin" ? "Admin"
        : profile?.rol === "recruiter" ? "Recruiter"
        : profile?.rol === "setter" ? "Setter"
        : "Gebruiker";

      const from = "Noah <noreply@grywo.nl>";
      console.log("[wachtwoord-vergeten] versturen vanaf:", from, "naar:", email);
      await sendInloggegevensOpnieuw({
        naar: email,
        voornaam: profile?.voornaam ?? "",
        email,
        wachtwoord: nieuwWachtwoord,
        rolLabel,
        bedrijf,
        from,
      });
      console.log("[wachtwoord-vergeten] mail verzonden ok");
    } else {
      console.log("[wachtwoord-vergeten] email niet bekend:", email);
    }
  } catch (e) {
    console.error("[wachtwoord-vergeten] mislukt:", (e as Error).message);
    redirect(`/wachtwoord-vergeten?error=${encodeURIComponent("Verzenden mislukt: " + (e as Error).message)}`);
  }

  redirect("/wachtwoord-vergeten?ok=1");
}
