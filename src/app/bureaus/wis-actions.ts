"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isSuperAdminEmail } from "@/utils/auth";

export async function wisAlleTestdata(): Promise<{ ok?: boolean; error?: string; samenvatting?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };
  if (!isSuperAdminEmail(user.email)) return { error: "Alleen super-admin mag dit doen" };

  const admin = createAdminClient();
  const samenvatting: string[] = [];

  try {
    // 1. Alle kandidaten verwijderen — cascade ruimt voorstellen, plaatsingen,
    //    bellijsten en alle aan kandidaat gekoppelde records op
    const { count: kandCount } = await admin
      .from("kandidaten")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    samenvatting.push(`${kandCount ?? 0} kandidaten verwijderd`);

    // 2. EOD-rapporten, coaching-aanvragen, agenda-events, wachtenden opruimen
    const { count: eodCount } = await admin
      .from("eod_rapporten")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    samenvatting.push(`${eodCount ?? 0} EOD-rapporten`);

    const { count: coachCount } = await admin
      .from("coaching_aanvragen")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    samenvatting.push(`${coachCount ?? 0} coaching-aanvragen`);

    const { count: agendaCount } = await admin
      .from("agenda_events")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    samenvatting.push(`${agendaCount ?? 0} agenda-events`);

    const { count: wachtCount } = await admin
      .from("wachtend_op_cv")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    samenvatting.push(`${wachtCount ?? 0} wachtend-op-cv`);

    // 3. Profiles met rol setter/recruiter + hun auth-users wissen
    const { data: teVerwijderen } = await admin
      .from("profiles")
      .select("id")
      .in("rol", ["setter", "recruiter"]);

    const ids = (teVerwijderen ?? []).map(p => p.id);
    if (ids.length > 0) {
      await admin.from("profiles").delete().in("id", ids);
      let authVerwijderd = 0;
      for (const id of ids) {
        try {
          await admin.auth.admin.deleteUser(id);
          authVerwijderd++;
        } catch (e) {
          console.error("[wis-test] auth-user verwijderen mislukt:", id, e);
        }
      }
      samenvatting.push(`${ids.length} setter/recruiter profiles + ${authVerwijderd} auth-users`);
    }

    // 4. Notificaties opruimen (kunnen verwijzen naar verwijderde users/kandidaten)
    const { count: notifCount } = await admin
      .from("notificaties")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    samenvatting.push(`${notifCount ?? 0} notificaties`);

    // 5. Voorstel-logs opruimen
    const { count: logCount } = await admin
      .from("voorstel_logs")
      .delete({ count: "exact" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    samenvatting.push(`${logCount ?? 0} voorstel-logs`);
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/bureaus");
  revalidatePath("/kandidaten");
  revalidatePath("/users");
  return { ok: true, samenvatting: samenvatting.join(" · ") };
}
