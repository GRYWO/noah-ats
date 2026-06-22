import { redirect } from "next/navigation";

// Het oude dashboard is vervangen: de vacatures-/setterpagina is nu het
// Dashboard. We sturen alle oude links/bladwijzers daarheen door.
export default function DashboardRedirect() {
  redirect("/vacature-aanmaken");
}
