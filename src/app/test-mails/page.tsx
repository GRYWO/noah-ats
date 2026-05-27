import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isSuperAdminEmail } from "@/utils/auth";
import { TopBar } from "@/components/TopBar";
import { TestMailsApp } from "./TestMailsApp";

export default async function TestMailsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isSuperAdminEmail(user.email)) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-[#f4f4f7] pl-16">
      <TopBar active="dashboard" />
      <div className="p-8 max-w-4xl mx-auto">
        <TestMailsApp />
      </div>
    </main>
  );
}
