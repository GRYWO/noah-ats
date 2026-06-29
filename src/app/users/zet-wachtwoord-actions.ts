"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

// Super-admin zet handmatig een zelfgekozen wachtwoord op een account (via e-mail).
// Rol-onafhankelijk: werkt voor setter, recruiter en bureau-admin. Geen mail nodig,
// de super-admin geeft het wachtwoord zelf door.
export async function zetWachtwoordHandmatig(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string; email?: string }> {
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const wachtwoord = (formData.get("wachtwoord") as string) ?? "";
  if (!email) return { error: "Vul een e-mailadres in." };
  if (wachtwoord.length < 6) return { error: "Wachtwoord moet minstens 6 tekens zijn." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return { error: "Alleen de super-admin mag dit." };
  }

  const admin = createAdminClient();

  // Auth-user opzoeken op e-mailadres.
  const { data: usersData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) return { error: "Kon gebruikers niet ophalen: " + listErr.message };
  const doel = usersData.users.find((u) => u.email?.toLowerCase() === email);
  if (!doel) return { error: `Geen account gevonden met e-mailadres ${email}.` };

  // Wachtwoord zetten en e-mail meteen als bevestigd markeren (voor het geval
  // het account nog niet bevestigd was, wat ook "Invalid login credentials" geeft).
  const { error: updErr } = await admin.auth.admin.updateUserById(doel.id, {
    password: wachtwoord,
    email_confirm: true,
  });
  if (updErr) return { error: updErr.message };

  return { ok: true, email };
}
