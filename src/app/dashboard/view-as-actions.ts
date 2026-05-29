"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { COOKIE_NAAM, type DemoRol } from "@/utils/view-as";

/**
 * Activeer demo-modus: bekijk de ATS als een setter/recruiter/admin.
 * Alleen super-admin (Yorith) mag dit. Cookie is browser-only (httpOnly: false
 * niet nodig — we lezen het server-side, niet client-side).
 */
export async function startDemoModus(rol: DemoRol) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return; // silent fail — alleen super-admin
  }
  if (!["admin", "bureau_admin", "recruiter", "setter"].includes(rol)) return;

  const c = await cookies();
  c.set(COOKIE_NAAM, rol, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4, // 4 uur
  });
  redirect("/dashboard");
}

/**
 * Stop demo-modus: terug naar super-admin view.
 */
export async function stopDemoModus() {
  const c = await cookies();
  c.delete(COOKIE_NAAM);
  redirect("/dashboard");
}
